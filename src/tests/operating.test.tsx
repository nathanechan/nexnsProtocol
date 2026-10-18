import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  createSimulationStore,
  simulationStore,
  persistSnapshot,
} from "../simulation/store";
import { makeBook, referralCode } from "../simulation/operating-actions";
import { projectKey } from "../domain/identity";
import {
  activePrincipal,
  coverage,
  tier,
  nextTier,
  contributions,
  validPrices,
  cumulativeClaim,
  displayProgress,
} from "../domain/economics/operating";
import {
  emptyMember,
  settleOperatingDay,
  MAX_SUPPLY,
} from "../domain/economics/settlement";
import { UNIT, parseAmount, decimal } from "../domain/economics/amount";
import type { Address } from "../domain/models";
import type { ProtocolMember } from "../domain/economics/operating-models";
import {
  AssetsPanel,
  ContributionPanel,
  PersonalOverview,
} from "../components/operating-panels";
import { MyNexus } from "../components/my-nexus";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
const key = projectKey(56, "0x" + "1".repeat(40));
const addr = (n: number) =>
  ("0x" + n.toString(16).padStart(40, "0")) as Address;
const initialize = () => {
  const s = createSimulationStore();
  s.getState().seedScenario(key, "operating");
  return s;
};
function node(
  wallet: Address,
  sponsor: Address | null,
  principal = "2400",
  staked = "2400",
): ProtocolMember {
  const m = emptyMember(wallet, sponsor);
  m.bound = true;
  m.staked = parseAmount(staked).toString();
  if (principal !== "0")
    m.lots = [
      {
        id: `L-${wallet}`,
        projectKey: key,
        wallet,
        principal: parseAmount(principal).toString(),
        capacity: ((parseAmount(principal) * 5n) / 2n).toString(),
        used: "0",
        settledGross: "0",
        createdAt: "2026-10-11T00:00:00Z",
        completedAt: null,
        status: "ACTIVE",
      },
    ];
  return m;
}
beforeEach(() => {
  simulationStore.getState().reset();
  localStorage.clear();
});
afterEach(cleanup);
describe("coverage and contribution economics", () => {
  it.each([
    ["0", 0, 0],
    ["0.049999", 0, 0],
    ["0.05", 1, 20],
    ["0.149999", 1, 20],
    ["0.15", 2, 40],
    ["0.299999", 2, 40],
    ["0.30", 3, 60],
    ["0.499999", 3, 60],
    ["0.50", 4, 80],
  ])("tier %s", (c, index, rate) => {
    expect(tier(parseAmount(c))).toMatchObject({
      index,
      multiplier: index,
      rateBps: rate,
    });
  });
  it("computes exact coverage and next requirement", () => {
    expect(coverage(1000n * UNIT, 100n * UNIT, UNIT / 2n)).toBe(UNIT / 20n);
    expect(nextTier(1000n * UNIT, 100n * UNIT, UNIT / 2n)).toEqual({
      target: 15n,
      required: 300n * UNIT,
      additional: 200n * UNIT,
    });
    expect(coverage(0n, UNIT, UNIT)).toBeNull();
    expect(coverage(UNIT, UNIT, null)).toBeNull();
  });
  it("protected prices use distinct conservative values; invalid never falls back", () => {
    expect(
      validPrices({
        status: "PROTECTED",
        direct: UNIT.toString(),
        indirect: ((UNIT * 110n) / 100n).toString(),
      }),
    ).toEqual({ stake: UNIT, reward: (UNIT * 110n) / 100n });
    expect(
      validPrices({
        status: "PRICE_INVALID",
        direct: UNIT.toString(),
        indirect: UNIT.toString(),
      }),
    ).toBeNull();
    expect(
      validPrices({
        status: "VALID",
        direct: UNIT.toString(),
        indirect: ((UNIT * 116n) / 100n).toString(),
      }),
    ).toBeNull();
  });
  it("one branch has zero diversified contribution", () => {
    const members = {
      [addr(1)]: node(addr(1), null),
      [addr(2)]: node(addr(2), addr(1)),
    };
    expect(contributions(members, UNIT / 2n)[addr(1)].value).toBe(0n);
  });
  it("multiple branches remove largest and react when largest changes", () => {
    const members = {
      [addr(1)]: node(addr(1), null),
      [addr(2)]: node(addr(2), addr(1), "2400"),
      [addr(3)]: node(addr(3), addr(1), "1200", "1200"),
    };
    expect(contributions(members, UNIT / 2n)[addr(1)].value).toBe(1200n * UNIT);
    members[addr(3)] = node(addr(3), addr(1), "4800", "4800");
    expect(contributions(members, UNIT / 2n)[addr(1)].value).toBe(2400n * UNIT);
    members[addr(2)].staked = "0";
    expect(contributions(members, UNIT / 2n)[addr(1)].value).toBe(0n);
  });
  it("inactive ancestor preserves descendants and has no reward weight", () => {
    const members = {
      [addr(1)]: node(addr(1), null),
      [addr(2)]: node(addr(2), addr(1), "0", "0"),
      [addr(3)]: node(addr(3), addr(2)),
      [addr(4)]: node(addr(4), addr(1)),
    };
    const graph = contributions(members, UNIT / 2n);
    expect(graph[addr(1)].value).toBe(2400n * UNIT);
    expect(graph[addr(2)].weight).toBe(0n);
    expect(graph[addr(1)].activeNetwork).toBe(2);
  });
  it("cycle is rejected", () => {
    const members = {
      [addr(1)]: node(addr(1), addr(2)),
      [addr(2)]: node(addr(2), addr(1)),
    };
    expect(() => contributions(members, UNIT)).toThrow(/循环/);
  });
});
describe("Operating state actions", () => {
  it("invited first participation binds atomically without enabling promotion", () => {
    const s = initialize();
    const wallet = s.getState().currentUser.wallet;
    const root = s.getState().projects[key].creatorWallet;
    const code = referralCode(key, root);
    s.getState().setOperatingFailure();
    expect(() => s.getState().participate(key, "10", code)).toThrow();
    expect(
      s.getState().operatingBooks[key]?.members[wallet]?.bound ?? false,
    ).toBe(false);
    s.getState().participate(key, "10", code);
    const m = s.getState().operatingBooks[key].members[wallet];
    expect(m.sponsor).toBe(root);
    expect(m.bound).toBe(true);
    expect(m.promotionEnabled).toBe(false);
    s.getState().participate(key, "10", "unrelated-invalid-link");
    expect(s.getState().operatingBooks[key].members[wallet].sponsor).toBe(root);
    persistSnapshot(s.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(
      restored.getState().operatingBooks[key].members[wallet].promotionEnabled,
    ).toBe(false);
    const before = structuredClone(s.getState().exactBalances);
    s.getState().enablePromotion(key, "");
    expect(
      s.getState().operatingBooks[key].members[wallet].promotionEnabled,
    ).toBe(true);
    expect(s.getState().exactBalances).toEqual(before);
  });
  it("invalid first invitations cannot change balances or create a position", () => {
    const s = initialize();
    const before = structuredClone(s.getState().exactBalances);
    expect(() => s.getState().participate(key, "10", "invalid")).toThrow();
    expect(s.getState().exactBalances).toEqual(before);
    const wallet = s.getState().currentUser.wallet;
    expect(
      s.getState().operatingBooks[key]?.members[wallet]?.lots ?? [],
    ).toHaveLength(0);
    s.getState().participate(key, "10");
    s.getState().participate(
      key,
      "10",
      referralCode(key, s.getState().projects[key].creatorWallet),
    );
    expect(s.getState().operatingBooks[key].members[wallet].bound).toBe(false);
  });

  it("promotion is explicit, requires an inviter and preserves financial state", () => {
    const s = initialize();
    s.getState().participate(key, "100");
    const wallet = s.getState().currentUser.wallet;
    const balances = structuredClone(s.getState().exactBalances);
    const lots = structuredClone(
      s.getState().operatingBooks[key].members[wallet].lots,
    );
    expect(s.getState().operatingBooks[key].members[wallet].bound).toBe(false);
    expect(() => s.getState().enablePromotion(key, "")).toThrow();
    const root = s.getState().projects[key].creatorWallet;
    s.getState().enablePromotion(key, referralCode(key, root));
    expect(s.getState().operatingBooks[key].members[wallet].bound).toBe(true);
    expect(s.getState().operatingBooks[key].members[wallet].sponsor).toBe(root);
    expect(s.getState().exactBalances).toEqual(balances);
    expect(s.getState().operatingBooks[key].members[wallet].lots).toEqual(lots);
    s.getState().participate(key, "50");
    expect(s.getState().operatingBooks[key].members[wallet].sponsor).toBe(root);
  });

  it("independent participation leaves invitation relationship unbound", () => {
    const s = initialize();
    s.getState().participate(key, "1000");
    s.getState().participate(key, "2000");
    const m =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    expect(m.lots).toHaveLength(2);
    expect(m.lots.map((l) => l.capacity)).toEqual([
      parseAmount("2500").toString(),
      parseAmount("5000").toString(),
    ]);
    expect(m.lots[0].id).not.toBe(m.lots[1].id);
    expect(activePrincipal(m)).toBe(3000n * UNIT);
    expect(BigInt(s.getState().exactBalances["56:usdt"])).toBe(7000n * UNIT);
    expect(m.sponsor).toBeNull();
    expect(m.bound).toBe(false);
    expect(s.getState().projects[key].operating?.activePositionValue).toBe(
      3000,
    );
    expect(s.getState().projects[key].operating?.activeParticipants).toBe(1);
  });
  it("rejects self referral, cross-project code and sponsor replacement", () => {
    const s = initialize();
    const wallet = s.getState().currentUser.wallet;
    expect(() =>
      s.getState().enablePromotion(key, referralCode(key, wallet)),
    ).toThrow(/自己/);
    expect(() =>
      s
        .getState()
        .enablePromotion(key, referralCode(projectKey(56, addr(5)), wallet)),
    ).toThrow(/当前项目/);
    s.getState().participate(key, "10");
    s.getState().enablePromotion(
      key,
      referralCode(key, s.getState().projects[key].creatorWallet),
    );
    s.getState().seedNetwork(key);
    const other = Object.values(s.getState().operatingBooks[key].members).find(
      (m) =>
        m.wallet !== wallet &&
        m.wallet !== s.getState().projects[key].creatorWallet,
    )!;
    expect(() =>
      s.getState().enablePromotion(key, referralCode(key, other.wallet)),
    ).toThrow(/不能更换/);
  });
  it("accepts project referral and creator root participates without a parent", () => {
    const s = initialize();
    const root = s.getState().projects[key].creatorWallet;
    s.getState().enablePromotion(key, referralCode(key, root));
    expect(
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet]
        .sponsor,
    ).toBe(root);
    const creator = initialize();
    creator.setState({
      currentUser: { ...creator.getState().currentUser, wallet: root },
    });
    creator.getState().participate(key, "100");
    expect(
      creator.getState().operatingBooks[key].members[root].sponsor,
    ).toBeNull();
  });
  it("stake and unstake update balances, summary and coverage", () => {
    const s = initialize();
    s.getState().participate(key, "1000");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "100");
    const wallet = s.getState().currentUser.wallet;
    expect(
      coverage(
        activePrincipal(s.getState().operatingBooks[key].members[wallet]),
        BigInt(s.getState().operatingBooks[key].members[wallet].staked),
        UNIT / 2n,
      ),
    ).toBe(UNIT / 20n);
    expect(BigInt(s.getState().exactBalances[key])).toBe(49900n * UNIT);
    s.getState().stakeTokens(key, "40", true);
    expect(BigInt(s.getState().exactBalances[key])).toBe(49940n * UNIT);
    expect(s.getState().projects[key].operating?.totalStaked).toBe(60);
  });
  it("invalid price blocks risk but preserves unstake and historical claim rights", () => {
    const s = initialize();
    s.getState().seedOperating(key, "claimable");
    const m =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    s.getState().replaceProject({
      ...s.getState().projects[key],
      priceStatus: "PRICE_INVALID",
    });
    expect(() => s.getState().participate(key, "10")).toThrow(/有效价格/);
    expect(() => s.getState().stakeTokens(key, "10")).toThrow(/有效价格/);
    s.getState().stakeTokens(key, "1", true);
    s.getState().claimReward(key, decimal(BigInt(m.claimable)));
    expect(s.getState().operatingBooks[key].members[m.wallet].claimable).toBe(
      "0",
    );
  });
  it("failures leave financial state unchanged", () => {
    const s = initialize();
    s.getState().setOperatingFailure();
    const before = JSON.stringify({
      b: s.getState().exactBalances,
      o: s.getState().operatingBooks,
    });
    expect(() => s.getState().participate(key, "10")).toThrow(/失败/);
    expect(
      JSON.stringify({
        b: s.getState().exactBalances,
        o: s.getState().operatingBooks,
      }),
    ).toBe(before);
    expect(() => s.getState().participate(key, "20000")).toThrow(/不足/);
    expect(() => s.getState().stakeTokens(key, "1", true)).toThrow(/超过/);
    expect(() => s.getState().claimReward(key, "1")).toThrow(/没有/);
  });
});
describe("daily reward settlement", () => {
  it("per-lot reward and full day result", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "2400");
    s.getState().settleDay(key);
    const b = s.getState().operatingBooks[key],
      m = b.members[s.getState().currentUser.wallet];
    expect(BigInt(m.claimable)).toBe(parseAmount("38.4"));
    expect(BigInt(m.lots[0].used)).toBe(parseAmount("19.2"));
    expect(b.settlements[0].members[m.wallet].network).toBe("0");
    expect(b.day > b.settlements[0].day).toBe(true);
  });
  it("late staking only earns for remaining valid hours", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().advanceHours(key, 12);
    s.getState().stakeTokens(key, "2400");
    s.getState().settleDay(key);
    const m =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    expect(BigInt(m.claimable)).toBe(parseAmount("19.2"));
  });
  it("unstake cannot rewrite earlier hourly eligibility", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "2400");
    s.getState().advanceHours(key, 6);
    s.getState().stakeTokens(key, "2400", true);
    s.getState().settleDay(key);
    const m =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    expect(BigInt(m.claimable)).toBe(parseAmount("9.6"));
  });
  it("capacity truncation completes lot and retains rights", () => {
    const s = initialize();
    s.getState().seedOperating(key, "nearCapacity");
    s.getState().settleDay(key);
    const m =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    expect(m.lots[0].status).toBe("COMPLETED");
    expect(m.lots[0].used).toBe(m.lots[0].capacity);
    expect(activePrincipal(m)).toBe(0n);
    expect(BigInt(m.claimable) > 0n).toBe(true);
    expect(m.lots[0].completedAt).not.toBeNull();
  });
  it("network uses FIFO after independent participation allocations", () => {
    const s = initialize();
    const p = s.getState().projects[key];
    const b = makeBook(p);
    const a = addr(10);
    const m = node(a, null, "2400", "4800");
    m.lots[0].id = "LOT-A";
    m.lots.push({
      ...m.lots[0],
      id: "LOT-B",
      createdAt: "2026-10-11T01:00:00Z",
    });
    m.lots[0].used = (
      BigInt(m.lots[0].capacity) - parseAmount("25")
    ).toString();
    b.members = {
      [a]: m,
      [addr(11)]: node(addr(11), a),
      [addr(12)]: node(addr(12), a),
    };
    b.snapshots = [
      { hour: 0, members: structuredClone(b.members), prices: b.prices },
    ];
    const result = settleOperatingDay(b);
    const lots = result.book.members[a].lots;
    expect(BigInt(lots[0].used)).toBe(BigInt(lots[0].capacity));
    expect(BigInt(lots[1].used) > parseAmount("19.2")).toBe(true);
    expect(BigInt(result.record.members[a].network) > 0n).toBe(true);
  });
  it("uniform daily issuance cap limits all candidates without reallocation", () => {
    const s = initialize();
    const b = makeBook(s.getState().projects[key]);
    const a = addr(10);
    b.members = { [a]: node(a, null), [addr(11)]: node(addr(11), null) };
    b.snapshots = [
      { hour: 0, members: structuredClone(b.members), prices: b.prices },
    ];
    b.lifetimeMinted = (MAX_SUPPLY - 2000n * UNIT).toString();
    const result = settleOperatingDay(b);
    expect(BigInt(result.record.minted)).toBe(UNIT);
    expect(result.record.members[a].gross).toBe((UNIT / 2n).toString());
    expect(result.record.members[addr(11)].gross).toBe((UNIT / 2n).toString());
    expect(BigInt(result.book.members[a].lots[0].used)).toBe(UNIT / 4n);
  });
  it("zero-candidate day finalizes without creating debt and rejects repeat day", () => {
    const s = initialize();
    s.getState().settleDay(key);
    const b = s.getState().operatingBooks[key];
    expect(b.settlements[0].status).toBe("NO_REWARD");
    expect(b.settlements[0].minted).toBe("0");
    expect(() =>
      settleOperatingDay({ ...b, day: b.settlements[0].day }),
    ).toThrow(/已经结算/);
  });
  it("invalid intervals accrue no new reward", () => {
    const s = initialize();
    const b = makeBook(s.getState().projects[key]);
    const a = addr(1);
    b.members = { [a]: node(a, null) };
    b.snapshots = [
      {
        hour: 0,
        members: structuredClone(b.members),
        prices: { ...b.prices, status: "PRICE_INVALID" },
      },
    ];
    expect(settleOperatingDay(b).record.minted).toBe("0");
  });
  it("display progression changes no entitlement", () => {
    const s = initialize();
    s.getState().seedOperating(key, "claimable");
    const before = JSON.stringify(s.getState().operatingBooks);
    expect(displayProgress(100n * UNIT, 43200n)).toBe(50n * UNIT);
    expect(displayProgress(100n * UNIT, 100000n)).toBe(100n * UNIT);
    expect(JSON.stringify(s.getState().operatingBooks)).toBe(before);
  });
});
describe("claim and cross-app state", () => {
  it("partial/full claims produce net receipts and history without capacity changes", () => {
    const s = initialize();
    s.getState().seedOperating(key, "claimable");
    const wallet = s.getState().currentUser.wallet;
    const m = s.getState().operatingBooks[key].members[wallet];
    const used = m.lots[0].used;
    const gross = BigInt(m.claimable);
    const initial = BigInt(s.getState().exactBalances[key]);
    s.getState().claimReward(key, "1");
    expect(BigInt(s.getState().exactBalances[key])).toBe(
      initial + parseAmount("0.85"),
    );
    s.getState().claimReward(key, decimal(gross - UNIT));
    const next = s.getState().operatingBooks[key];
    expect(next.members[wallet].claimable).toBe("0");
    expect(next.members[wallet].lots[0].used).toBe(used);
    expect(next.claims).toHaveLength(2);
    expect(BigInt(s.getState().exactBalances[key])).toBe(
      initial + (gross * 85n) / 100n,
    );
    expect(BigInt(next.burned) > 0n).toBe(true);
  });
  it("cumulative splitting preserves all allocations and escrow rounding", () => {
    let previous = 0n,
      net = 0n,
      burn = 0n,
      creator = 0n,
      platform = 0n,
      dust = 0n;
    for (let i = 0; i < 100; i++) {
      const q = cumulativeClaim(2n, previous);
      previous += 2n;
      net += q.received;
      burn += q.burned;
      creator += q.creator;
      platform += q.platform;
      dust += q.dustDelta;
      expect(q.platform >= 0n).toBe(true);
      expect(dust >= 0n).toBe(true);
    }
    const q = cumulativeClaim(200n, 0n);
    expect(net).toBe(q.received);
    expect(burn).toBe(q.burned);
    expect(creator).toBe(q.creator);
    expect(platform).toBe(q.platform);
    expect(net + burn + creator + platform + dust).toBe(200n);
  });
  it("failed or oversized claim preserves claimable, history and balance", () => {
    const s = initialize();
    s.getState().seedOperating(key, "claimable");
    s.getState().setOperatingFailure();
    const before = JSON.stringify({
      b: s.getState().exactBalances,
      o: s.getState().operatingBooks,
    });
    expect(() => s.getState().claimReward(key, "1")).toThrow(/失败/);
    expect(
      JSON.stringify({
        b: s.getState().exactBalances,
        o: s.getState().operatingBooks,
      }),
    ).toBe(before);
    expect(() => s.getState().claimReward(key, "100000")).toThrow(/超过/);
  });
  it("participation, stake, settlement, claim and My NEXUS synchronize without remount", () => {
    simulationStore.getState().seedScenario(key, "operating");
    render(<MyNexus />);
    expect(screen.getByText("暂无资产")).toBeDefined();
    act(() => simulationStore.getState().participate(key, "2400"));
    expect(screen.queryByText("暂无资产")).toBeNull();
    expect(screen.getAllByText("2,400 USDT").length).toBeGreaterThan(0);
    act(() => {
      simulationStore.getState().fundToken(key);
      simulationStore.getState().stakeTokens(key, "2400");
      simulationStore.getState().settleDay(key);
      simulationStore.getState().claimReward(key, "1");
    });
    expect(
      simulationStore.getState().currentUser.projectPositions[0].used,
    ).toBe(19.2);
    expect(simulationStore.getState().currentUser.rewards[0].claimable).toBe(
      37.4,
    );
    expect(simulationStore.getState().currentUser.stakes[0].coverage).toBe(0.5);
  });
  it("primary contribution UI contains outcomes without algorithm formulas", () => {
    simulationStore.getState().seedScenario(key, "operating");
    simulationStore.getState().seedOperating(key, "contribution");
    render(
      <ContributionPanel project={simulationStore.getState().projects[key]} />,
    );
    expect(screen.getByText("贡献值")).toBeDefined();
    expect(screen.queryByText(/T_i|L_i|λ|最大部门|分支积分/)).toBeNull();
  });
  it("assets and overview update from shared state", () => {
    simulationStore.getState().seedScenario(key, "operating");
    render(
      <>
        <PersonalOverview project={simulationStore.getState().projects[key]} />
        <AssetsPanel project={simulationStore.getState().projects[key]} />
      </>,
    );
    act(() => simulationStore.getState().participate(key, "1000"));
    expect(screen.getAllByText("1,000 USDT").length).toBeGreaterThan(0);
  });
  it("Operating books persist and reset removes lots", () => {
    const s = initialize();
    s.getState().seedOperating(key, "claimable");
    s.getState().claimReward(key, "1");
    persistSnapshot(s.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(restored.getState().operatingBooks).toEqual(
      s.getState().operatingBooks,
    );
    expect(restored.getState().currentUser.rewards).toEqual(
      s.getState().currentUser.rewards,
    );
    restored.getState().reset();
    expect(restored.getState().currentUser.projectPositions).toEqual([]);
  });
});

describe("Operating boundary and persistence safety", () => {
  it("day-end unstake preserves the frozen earlier hours", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "2400");
    s.getState().advanceHours(key, 24);
    s.getState().stakeTokens(key, "2400", true);
    s.getState().settleDay(key);
    const member =
      s.getState().operatingBooks[key].members[s.getState().currentUser.wallet];
    expect(member.staked).toBe("0");
    expect(member.claimable).toBe(parseAmount("38.4").toString());
  });
  it("price changes never revalue historical capacity", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "2400");
    s.getState().settleDay(key);
    const b = s.getState().operatingBooks[key];
    const prices = {
      ...b.prices,
      direct: UNIT.toString(),
      indirect: UNIT.toString(),
    };
    const second = settleOperatingDay({
      ...b,
      prices,
      snapshots: [{ hour: 0, members: structuredClone(b.members), prices }],
    });
    const wallet = s.getState().currentUser.wallet;
    expect(second.book.members[wallet].lots[0].used).toBe(
      parseAmount("38.4").toString(),
    );
    expect(second.record.members[wallet].gross).toBe(
      parseAmount("19.2").toString(),
    );
  });
  it("rejects a saved lot that exceeds its capacity", () => {
    const s = initialize();
    s.getState().participate(key, "100");
    persistSnapshot(s.getState(), localStorage);
    const saved = JSON.parse(localStorage.getItem("nexus-simulation-v3")!);
    saved.operatingBooks[key].members[
      s.getState().currentUser.wallet
    ].lots[0].used = parseAmount("251").toString();
    localStorage.setItem("nexus-simulation-v3", JSON.stringify(saved));
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(localStorage.getItem("nexus-simulation-v3")).toBeNull();
    expect(restored.getState().currentUser.projectPositions).toEqual([]);
  });
  it("market cap follows simulated issuance and claim burns", () => {
    const s = initialize();
    s.getState().participate(key, "2400");
    s.getState().fundToken(key);
    s.getState().stakeTokens(key, "2400");
    s.getState().settleDay(key);
    expect(s.getState().projects[key].operating?.marketCap).toBe(500019.2);
    s.getState().claimReward(key, "10");
    expect(s.getState().projects[key].operating?.marketCap).toBe(500018.825);
  });
});
