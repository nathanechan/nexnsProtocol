import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  createSimulationStore,
  persistSnapshot,
  balanceKey,
} from "../simulation/store";
import {
  reconcileLive,
  marketDataAdapter,
  referenceHistory,
  stakedValue,
  liveStakeHistory,
} from "../simulation/live-market";
import { marketRow, marketRows } from "../data/market";
import { personalRows } from "../product/read-model";
import { portfolioSummary } from "../product/portfolio";
import { compactUsdtValue } from "../product/market-format";
import { localTime } from "../product/format";
import { AnimatedAmount } from "../components/animated-amount";
import { projectKey } from "../domain/identity";
import { decimal } from "../domain/economics/amount";
const epoch = Date.parse("2026-10-12T12:00:00Z");
const key = projectKey(56, "0x" + "4".repeat(40));
function setup(preset: "mid" | "claimable" = "mid") {
  const store = createSimulationStore();
  store.getState().seedOperating(key, preset);
  store.getState().fundToken(key);
  store.getState().advanceMarket(epoch);
  return store;
}
const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  } as Storage;
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("shared live market adapter", () => {
  it("computes value solely from price times total stake", () => {
    const store = setup();
    store.getState().advanceMarket(epoch + 8 * 3600000);
    const p = marketDataAdapter(store.getState()).projects[key];
    expect(marketRow(p).value).toBe(
      p.operating!.totalStaked * p.operating!.tokenPrice!,
    );
    expect(stakedValue(12_840_000, 0.52)).toBe(6_676_800);
    expect(stakedValue(10, null)).toBeNull();
  });
  it("stake immediately changes global amount and appends history", () => {
    const store = setup(),
      before = marketDataAdapter(store.getState()).projects[key].operating!
        .totalStaked;
    store.getState().stakeTokens(key, "10");
    const s = marketDataAdapter(store.getState());
    expect(s.projects[key].operating!.totalStaked).toBe(before + 10);
    expect(
      liveStakeHistory(s.projects[key], s.activities, s.liveMarket).at(-1)!
        .amount,
    ).toBe(before + 10);
  });
  it("unstake immediately reduces global amount", () => {
    const store = setup(),
      before = marketDataAdapter(store.getState()).projects[key].operating!
        .totalStaked;
    store.getState().stakeTokens(key, "4", true);
    expect(
      marketDataAdapter(store.getState()).projects[key].operating!.totalStaked,
    ).toBe(before - 4);
  });
  it("clock history ends at current global amount without rewriting the past", () => {
    const store = setup(),
      past = structuredClone(
        store.getState().liveMarket!.projects[key].history,
      );
    store.getState().advanceMarket(epoch + 8 * 3600000);
    const s = marketDataAdapter(store.getState()),
      history = liveStakeHistory(s.projects[key], s.activities, s.liveMarket);
    expect(history.slice(0, past.length)).toEqual(past);
    expect(history.at(-1)!.amount).toBe(s.projects[key].operating!.totalStaked);
  });
  it("serialized refresh retains the exact deterministic state", () => {
    const store = setup();
    store.getState().advanceMarket(epoch + 4 * 3600000);
    const storage = memory();
    persistSnapshot(store.getState(), storage);
    const restored = createSimulationStore();
    restored.getState().hydrate(storage);
    expect(restored.getState().liveMarket).toEqual(store.getState().liveMarket);
    expect(marketDataAdapter(restored.getState()).projects[key]).toEqual(
      marketDataAdapter(store.getState()).projects[key],
    );
  });
  it("never creates a point before migration completed", () => {
    const store = setup();
    const p = store.getState().projects[key];
    expect(
      store
        .getState()
        .liveMarket!.projects[key].history.every(
          (point) =>
            point.time >= Date.parse(p.migration.completedAt ?? p.createdAt),
        ),
    ).toBe(true);
  });
  it("counts a new participant once, without counting additional lots twice", () => {
    const store = createSimulationStore();
    store.getState().seedScenario(key, "operating");
    store.getState().advanceMarket(epoch);
    const before = marketDataAdapter(store.getState()).projects[key].operating!
      .activeParticipants;
    store.getState().participate(key, "100");
    expect(
      marketDataAdapter(store.getState()).projects[key].operating!
        .activeParticipants,
    ).toBe(before + 1);
    store.getState().participate(key, "100");
    expect(
      marketDataAdapter(store.getState()).projects[key].operating!
        .activeParticipants,
    ).toBe(before + 1);
  });
  it("reference price persists and has bounded project-specific history", () => {
    const store = setup();
    store.getState().advanceMarket(epoch + 24 * 3600000);
    const live = store.getState().liveMarket!,
      source = live.projects[key];
    const history = referenceHistory(source, key, live.now);
    expect(history.at(-1)!.price).toBe(
      marketDataAdapter(store.getState()).projects[key].operating!.tokenPrice,
    );
    expect(
      history.every(
        (p) =>
          p.price! > source.basePrice! * 0.97 &&
          p.price! < source.basePrice! * 1.03,
      ),
    ).toBe(true);
    const saved = memory();
    persistSnapshot(store.getState(), saved);
    const restored = createSimulationStore();
    restored.getState().hydrate(saved);
    expect(
      referenceHistory(
        restored.getState().liveMarket!.projects[key],
        key,
        live.now,
      ),
    ).toEqual(history);
  });
  it("Portfolio keeps exact quantities and recomputes reference valuation", () => {
    const store = setup(),
      before = portfolioSummary(
        personalRows(marketDataAdapter(store.getState())),
      );
    const quantities = store.getState().exactBalances;
    store.getState().advanceMarket(epoch + 8 * 3600000);
    const after = portfolioSummary(
      personalRows(marketDataAdapter(store.getState())),
    );
    expect(store.getState().exactBalances).toBe(quantities);
    expect(after.staked).not.toBe(before.staked);
    store.getState().stakeTokens(key, "10");
    expect(
      personalRows(marketDataAdapter(store.getState())).find(
        (r) => r.key === key,
      )!.staked,
    ).toBe(
      BigInt(
        store.getState().operatingBooks[key].members[
          store.getState().currentUser.wallet
        ].staked,
      ),
    );
  });
  it("claim changes the same exact balance used by Portfolio", () => {
    const store = setup("claimable"),
      s = store.getState(),
      wallet = s.currentUser.wallet;
    const before = BigInt(
      s.exactBalances[balanceKey(56, s.projects[key].tokenContract)],
    );
    const amount = BigInt(s.operatingBooks[key].members[wallet].claimable);
    s.claimReward(key, decimal(amount));
    const row = personalRows(marketDataAdapter(store.getState())).find(
      (r) => r.key === key,
    )!;
    expect(row.balance).toBeGreaterThan(before);
    expect(row.member!.claimable).toBe("0");
    expect(row.balance).toBe(BigInt(store.getState().exactBalances[key]));
  });
  it("Curve list follows the frozen buy and sell ledger", () => {
    const store = createSimulationStore(),
      curve = projectKey(56, "0x" + "1".repeat(40));
    store.getState().seedScenario(curve, "fresh");
    store.getState().advanceMarket(epoch);
    store.getState().trade(curve, "buy", "100");
    store.getState().trade(curve, "sell", "1");
    const p = marketDataAdapter(store.getState()).projects[curve];
    const row = marketRows(
      Object.values(marketDataAdapter(store.getState()).projects),
      "launch",
      "progress",
    ).find((r) => r.key === curve)!;
    expect(row.price).toBe(p.curve.curvePrice);
    expect(row.progress).toBe(p.curve.progress);
  });
  it("Live list reconciles all five terminal metrics", () => {
    const store = setup();
    store.getState().advanceMarket(epoch + 5 * 3600000);
    const s = marketDataAdapter(store.getState()),
      p = s.projects[key];
    const row = marketRows(Object.values(s.projects), "live", "value").find(
      (r) => r.key === key,
    )!;
    expect(row.totalStaked).toBe(p.operating!.totalStaked);
    expect(row.price).toBe(p.operating!.tokenPrice);
    expect(row.value).toBe(stakedValue(row.totalStaked!, row.price));
    expect(row.participants).toBe(p.operating!.activeParticipants);
    expect(row.liquidity).toBe(
      store.getState().projects[key].operating!.liquidity,
    );
  });
  it("graduation initializes Live at completed migration with no earlier history", () => {
    const store = createSimulationStore(),
      curve = projectKey(56, "0x" + "1".repeat(40));
    store.getState().seedScenario(curve, "near");
    store.getState().advanceMarket(epoch);
    store.getState().trade(curve, "buy", "1000");
    store.getState().startMigration(curve);
    store.getState().completeMigration(curve);
    const s = marketDataAdapter(store.getState()),
      p = s.projects[curve];
    expect(p.lifecycle).toBe("OPERATING");
    expect(
      s.liveMarket!.projects[curve].history.every(
        (point) => point.time >= Date.parse(p.migration.completedAt!),
      ),
    ).toBe(true);
    expect(
      marketRows(Object.values(s.projects), "live", "staked").some(
        (r) => r.key === curve,
      ),
    ).toBe(true);
    expect(
      marketRows(Object.values(s.projects), "launch", "progress").some(
        (r) => r.key === curve,
      ),
    ).toBe(false);
  });
  it("formats estimated currency consistently without rounding away detailed token quantities", () => {
    expect(compactUsdtValue(7999999990000000000n)).toBe("8 USDT");
    expect(compactUsdtValue(12840000000000000000000000n)).toBe("12.84M USDT");
    expect(compactUsdtValue(520000000000000000n)).toBe("0.52 USDT");
    expect(compactUsdtValue(null)).toBe("N/A");
  });
  it("formats local Chinese and English dates without raw ISO/UTC", () => {
    expect(
      localTime("2026-10-12T10:42:00Z", "zh-CN", "Asia/Kuala_Lumpur"),
    ).toMatch(/10月12日.*18:42/);
    expect(
      localTime("2026-10-12T10:42:00Z", "en", "Asia/Kuala_Lumpur"),
    ).toMatch(/Oct 12.*18:42/);
  });
  it("updates reduced-motion amounts immediately without scheduling animation", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const view = render(<AnimatedAmount value={100} />);
    view.rerender(<AnimatedAmount value={200} />);
    expect(view.container.textContent).toBe("200");
    expect(raf).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("a centralized clock retains bounded fifteen-minute samples", () => {
    const store = setup();
    const raw = store.getState();
    let live = raw.liveMarket!;
    const projects = { [key]: raw.projects[key] };
    for (let i = 1; i <= 5760; i++)
      live = reconcileLive(
        {
          projects,
          activities: raw.activities,
          operatingBooks: raw.operatingBooks,
          liveMarket: live,
        },
        epoch + i * 30000,
      );
    expect(live.projects[key].history.length).toBeLessThan(600);
    const state = marketDataAdapter({ ...raw, projects, liveMarket: live });
    expect(live.projects[key].history.at(-1)!.amount).toBe(
      state.projects[key].operating!.totalStaked,
    );
  });
  it("clock ticks preserve unchanged user, Curve and activity references", () => {
    const store = setup();
    store.getState().advanceMarket(epoch + 8 * 3600000);
    const before = marketDataAdapter(store.getState());
    store.getState().advanceMarket(epoch + 8 * 3600000 + 30000);
    const after = marketDataAdapter(store.getState());
    expect(after.currentUser).toBe(before.currentUser);
    expect(after.exactBalances).toBe(before.exactBalances);
    expect(after.activities).toBe(before.activities);
    const curve = projectKey(56, "0x" + "1".repeat(40));
    expect(after.projects[curve]).toBe(before.projects[curve]);
  });
  it("elapsed time changes presentation only, never finalized entitlements", () => {
    const store = setup("claimable"),
      before = store.getState();
    const engine = JSON.stringify({
      books: before.operatingBooks,
      balances: before.exactBalances,
      user: before.currentUser,
    });
    store.getState().advanceMarket(epoch + 90 * 86400000);
    const after = store.getState();
    expect(
      JSON.stringify({
        books: after.operatingBooks,
        balances: after.exactBalances,
        user: after.currentUser,
      }),
    ).toBe(engine);
    expect(after.liveMarket!.projects[key].history.length).toBeLessThan(500);
  });
});
