import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { parseAmount, UNIT, decimal } from "../domain/economics/amount";
import {
  quoteBuy,
  quoteSell,
  reserveAtSold,
  soldAtReserve,
  priceAtSold,
  graduation,
  RESERVE_TARGET,
  CURVE_INVENTORY,
  ledgerState,
  curveSeries,
  rollingVolume,
} from "../domain/economics/curve";
import { curvePercent } from "../product/format";
import {
  createSimulationStore,
  simulationStore,
  balanceKey,
  persistSnapshot,
  STORAGE_KEY,
} from "../simulation/store";
import { economyService } from "../data/service";
import { projectKey } from "../domain/identity";
import { validateIdentity, validateLinks } from "../domain/create";
import { ProjectShell } from "../components/project-shell";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const input = {
  name: "澄海经济",
  symbol: "SEA",
  description: "模拟经济体",
  logo: "S",
  links: [],
};
const zero = { reserve: 0n, sold: 0n };
const key = projectKey(56, "0x" + "1".repeat(40));
beforeEach(() => {
  simulationStore.getState().reset();
  localStorage.clear();
});
afterEach(cleanup);
describe("exact Curve engine", () => {
  it("expires volume after 24 hours without rounding financial amounts", () => {
    const ledger = {
      reserve: "0",
      sold: "0",
      volume: parseAmount("10").toString(),
      buyers: [],
      seedParticipants: 0,
      completedAt: null,
      updatedAt: "2026-10-10T08:00:00Z",
    };
    const first = {
      ...ledger,
      ...rollingVolume(ledger, "2026-10-10T09:00:00Z", parseAmount("100")),
    };
    expect(first.volume).toBe(parseAmount("110").toString());
    expect(rollingVolume(first, "2026-10-11T08:30:00Z").volume).toBe(
      parseAmount("100").toString(),
    );
    expect(rollingVolume(first, "2026-10-11T10:00:00Z").volume).toBe("0");
  });
  it("never displays completed progress before the target", () => {
    expect(curvePercent(0.9999999)).toBe("99.99%");
    expect(curvePercent(1)).toBe("100%");
  });
  it.each([
    ["0", "0", "0.03125"],
    ["400000", "20000", "0.08"],
    ["800000", "100000", "0.5"],
  ])("reference sold %s", (sold, reserve, price) => {
    expect(reserveAtSold(parseAmount(sold))).toBe(parseAmount(reserve));
    expect(priceAtSold(parseAmount(sold))).toBe(parseAmount(price));
    expect(soldAtReserve(parseAmount(reserve))).toBe(parseAmount(sold));
  });
  it("buy charges one percent and preserves reserve and inventory", () => {
    const q = quoteBuy(zero, "1000");
    expect(q.fee).toBe(10n * UNIT);
    expect(q.netInput).toBe(990n * UNIT);
    expect(q.newReserve).toBe(q.netInput);
    expect(q.newSold).toBe(q.tokenAmount);
    expect(q.newSold + (CURVE_INVENTORY - q.newSold)).toBe(CURVE_INVENTORY);
    expect(q.newPrice > priceAtSold(0n)).toBe(true);
  });
  it("sell returns inventory and preserves reserve less fee", () => {
    const buy = quoteBuy(zero, "1000");
    const sell = quoteSell(
      { reserve: buy.newReserve, sold: buy.newSold },
      decimal(buy.tokenAmount),
    );
    expect(sell.newSold).toBe(0n);
    expect(sell.newReserve).toBe(0n);
    expect(sell.receive + sell.fee).toBe(buy.netInput);
    expect(sell.receive < buy.accepted).toBe(true);
  });
  it("caps final payment and charges only accepted amount", () => {
    const reserve = parseAmount("99990");
    const q = quoteBuy({ reserve, sold: soldAtReserve(reserve) }, "10000");
    expect(q.accepted < q.entered).toBe(true);
    expect(q.accepted + q.unused).toBe(q.entered);
    expect(q.fee).toBe((q.accepted + 99n) / 100n);
    expect(q.newReserve).toBe(RESERVE_TARGET);
    expect(q.newSold).toBe(CURVE_INVENTORY);
    expect(q.graduates).toBe(true);
    expect(q.accepted - q.fee).toBe(10n * UNIT);
  });
  it.each(["0.000001", "1", "1000", "80000"])(
    "no positive round trip at %s",
    (amount) => {
      const buy = quoteBuy(zero, amount);
      const sell = quoteSell(
        { reserve: buy.newReserve, sold: buy.newSold },
        decimal(buy.tokenAmount),
      );
      expect(sell.receive < buy.accepted).toBe(true);
    },
  );
  it("graduation requires both inventory and reserve", () => {
    expect(
      graduation({ reserve: RESERVE_TARGET, sold: CURVE_INVENTORY - 1n }),
    ).toBe(false);
    expect(
      graduation({ reserve: RESERVE_TARGET - 1n, sold: CURVE_INVENTORY }),
    ).toBe(false);
    expect(graduation({ reserve: RESERVE_TARGET, sold: CURVE_INVENTORY })).toBe(
      true,
    );
  });
  it.each(["-1", "1e3", "NaN", "0", "1.0000000000000000001"])(
    "rejects invalid amount %s",
    (amount) => expect(() => quoteBuy(zero, amount)).toThrow(),
  );
  it("rejects invalid sell range and closed curve", () => {
    expect(() => quoteSell(zero, "1")).toThrow();
    expect(() =>
      quoteBuy({ reserve: RESERVE_TARGET, sold: CURVE_INVENTORY }, "1"),
    ).toThrow();
    expect(() =>
      quoteSell({ reserve: RESERVE_TARGET, sold: CURVE_INVENTORY }, "1"),
    ).toThrow();
  });
  it("chart derives current point and endpoint from engine", () => {
    const state = { reserve: 20000n * UNIT, sold: 400000n * UNIT };
    const points = curveSeries(state);
    expect(points.find((p) => p.current)).toMatchObject({
      reserve: state.reserve,
      price: priceAtSold(state.sold),
    });
    expect(points.at(-1)?.price).toBe(parseAmount("0.5"));
  });
});
describe("creation and shared simulation", () => {
  it("allows duplicate identity with unique IDs and addresses", () => {
    const store = createSimulationStore();
    const a = store.getState().createProject(input);
    const b = store.getState().createProject(input);
    expect(a).not.toBe(b);
    expect(store.getState().projects[a].projectId).not.toBe(
      store.getState().projects[b].projectId,
    );
    expect(store.getState().projects[a].lifecycle).toBe("CURVE_OPEN");
    expect(store.getState().curves[a].reserve).toBe("0");
  });
  it("new projects searchable by every supported identity field", async () => {
    const k = simulationStore.getState().createProject(input);
    const p = simulationStore.getState().projects[k];
    for (const query of [
      p.tokenContract,
      p.projectId,
      p.symbol,
      p.name,
      p.creatorWallet,
    ])
      expect(
        (await economyService.search(query)).some(
          (r) => r.project.tokenContract === p.tokenContract,
        ),
      ).toBe(true);
    expect(
      (await economyService.discovery("curve", "progress")).some(
        (p) =>
          p.tokenContract ===
          simulationStore.getState().projects[k].tokenContract,
      ),
    ).toBe(true);
    expect((await economyService.network()).recentCreated[0].projectId).toBe(
      p.projectId,
    );
  });
  it("validates lengths, bytes and safe links", () => {
    expect(
      validateIdentity({ ...input, name: "a".repeat(65) }).name,
    ).toBeDefined();
    expect(validateIdentity({ ...input, symbol: "中文" }).symbol).toBeDefined();
    expect(
      validateIdentity({ ...input, description: "字".repeat(683) }).description,
    ).toBeDefined();
    expect(
      validateLinks([{ label: "Docs", url: "javascript:alert(1)" }]).Docs,
    ).toBeDefined();
    expect(validateLinks([{ label: "Docs", url: "" }])).toEqual({});
  });
  it("buy/sell update exact balances, progress, activity, volume, participants and discovery", async () => {
    const k = simulationStore.getState().createProject(input);
    const p = simulationStore.getState().projects[k];
    const usdt = balanceKey(56, "USDT");
    const token = balanceKey(56, p.tokenContract);
    const initial = BigInt(simulationStore.getState().exactBalances[usdt]);
    const buy = simulationStore.getState().trade(k, "buy", "1000");
    expect(BigInt(simulationStore.getState().exactBalances[usdt])).toBe(
      initial - buy.accepted,
    );
    expect(BigInt(simulationStore.getState().exactBalances[token])).toBe(
      buy.tokenAmount,
    );
    expect(simulationStore.getState().projects[k].curve.participants).toBe(1);
    simulationStore.getState().trade(k, "buy", "100");
    expect(simulationStore.getState().projects[k].curve.participants).toBe(1);
    const sell = simulationStore.getState().trade(k, "sell", "1");
    expect(BigInt(simulationStore.getState().curves[k].reserve)).toBe(
      sell.newReserve,
    );
    expect(
      (await economyService.discovery("curve", "progress")).find(
        (x) => x.projectId === p.projectId,
      )?.curve.netReserve,
    ).toBe(simulationStore.getState().projects[k].curve.netReserve);
    expect(simulationStore.getState().projects[k].curve.volume24h > 1100).toBe(
      true,
    );
    expect(simulationStore.getState().currentUser.projectPositions).toEqual(
      createSimulationStore().getState().currentUser.projectPositions,
    );
    expect(simulationStore.getState().activities[0].type).toBe("SELL");
  });
  it("insufficient balances and simulated failures have no financial effects", () => {
    const s = createSimulationStore();
    s.getState().seedScenario(key, "fresh");
    expect(() => s.getState().trade(key, "buy", "20000")).toThrow(/不足/);
    expect(() => s.getState().trade(key, "sell", "1")).toThrow();
    const before = JSON.stringify({
      p: s.getState().projects,
      c: s.getState().curves,
      b: s.getState().exactBalances,
      a: s.getState().activities,
    });
    s.getState().setTradeFailure();
    expect(() => s.getState().trade(key, "buy", "100")).toThrow(/交易失败/);
    expect(
      JSON.stringify({
        p: s.getState().projects,
        c: s.getState().curves,
        b: s.getState().exactBalances,
        a: s.getState().activities,
      }),
    ).toBe(before);
  });
  it("rejects stale confirmed quotes", () => {
    const s = createSimulationStore();
    s.getState().seedScenario(key, "fresh");
    const quote = quoteBuy(ledgerState(s.getState().curves[key]), "100");
    s.getState().trade(key, "buy", "100");
    expect(() => s.getState().trade(key, "buy", "100", quote)).toThrow(
      /报价已变化/,
    );
  });
  it("graduation closes trading and changes search immediately", async () => {
    simulationStore.getState().seedScenario(key, "near");
    const q = simulationStore.getState().trade(key, "buy", "1000");
    expect(q.graduates).toBe(true);
    expect(simulationStore.getState().projects[key].lifecycle).toBe(
      "MIGRATION_READY",
    );
    expect(() => simulationStore.getState().trade(key, "buy", "1")).toThrow(
      /关闭/,
    );
    expect(() => simulationStore.getState().trade(key, "sell", "1")).toThrow(
      /关闭/,
    );
    expect((await economyService.search("NX-0001"))[0]?.project.lifecycle).toBe(
      "MIGRATION_READY",
    );
    expect(simulationStore.getState().activities[0].type).toBe(
      "CURVE_COMPLETED",
    );
  });
  it("migration fails cleanly then completes and moves discovery pool", async () => {
    simulationStore.getState().seedScenario(key, "ready");
    simulationStore.getState().startMigration(key);
    expect(simulationStore.getState().projects[key].lifecycle).toBe(
      "MIGRATING",
    );
    expect(
      simulationStore.getState().projects[key].migration.resultingPools,
    ).toEqual([]);
    simulationStore.getState().failMigration(key);
    expect(simulationStore.getState().projects[key].lifecycle).toBe(
      "MIGRATION_READY",
    );
    expect(
      simulationStore.getState().projects[key].migration.completedAt,
    ).toBeNull();
    simulationStore.getState().startMigration(key);
    simulationStore.getState().completeMigration(key);
    const p = simulationStore.getState().projects[key];
    expect(p.lifecycle).toBe("OPERATING");
    expect(p.migration.resultingPools.map((p) => p.pair)).toEqual([
      "X/USDT",
      "X/NEXUS",
    ]);
    expect(p.operating?.polValue).toBe(200000);
    expect(
      (await economyService.discovery("curve", "progress")).some(
        (p) => p.projectId === "NX-0001",
      ),
    ).toBe(false);
    expect(
      (await economyService.discovery("operating", "tvl")).some(
        (p) => p.projectId === "NX-0001",
      ),
    ).toBe(true);
  });
  it("platform identity uses one pool; repeated symbol does not", () => {
    const s = createSimulationStore();
    s.getState().replaceProject({
      ...s.getState().projects[key],
      isPlatformToken: true,
    });
    s.getState().seedScenario(key, "operating");
    expect(
      s.getState().projects[key].migration.resultingPools.map((p) => p.pair),
    ).toEqual(["NEXUS/USDT"]);
    const other = s.getState().createProject({ ...input, symbol: "NEXUS" });
    s.getState().seedScenario(other, "operating");
    expect(s.getState().projects[other].migration.resultingPools).toHaveLength(
      2,
    );
  });
  it("normal product provides no migration execution controls", () => {
    simulationStore.getState().seedScenario(key, "processing");
    render(
      <ProjectShell
        initialProject={simulationStore.getState().projects[key]}
      />,
    );
    expect(screen.queryByRole("button", { name: "开始迁移" })).toBeNull();
    expect(screen.queryByRole("button", { name: "完成迁移" })).toBeNull();
    expect(screen.getByText("迁移处理中")).toBeDefined();
  });
  it("persists projects, financial state, lifecycle and activity then resets seed", () => {
    const s = createSimulationStore();
    const k = s.getState().createProject(input);
    s.getState().trade(k, "buy", "100");
    persistSnapshot(s.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(restored.getState().projects).toEqual(s.getState().projects);
    expect(restored.getState().curves).toEqual(s.getState().curves);
    expect(restored.getState().exactBalances).toEqual(
      s.getState().exactBalances,
    );
    expect(restored.getState().activities).toEqual(s.getState().activities);
    restored.getState().reset();
    persistSnapshot(restored.getState(), localStorage);
    expect(restored.getState().projects[k]).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).projects[k],
    ).toBeUndefined();
  });
  it("rejects corrupt persistence", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    const s = createSimulationStore();
    s.getState().hydrate(localStorage);
    expect(s.getState().hydrated).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
