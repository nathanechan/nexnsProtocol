import React from "react";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  createSimulationStore,
  simulationStore,
  persistSnapshot,
  STORAGE_KEY,
} from "../simulation/store";
import { applyDemoPreset, demoPresets } from "../simulation/demo";
import {
  personalRows,
  supplyResult,
  creatorCurveRevenue,
  activityTrend,
  publicOutcomes,
} from "../product/read-model";
import { projectKey } from "../domain/identity";
import { UNIT, parseAmount } from "../domain/economics/amount";
import { MyNexus } from "../components/my-nexus";
import { CreatorStudio } from "../components/creator-studio";
import { ProtocolPage } from "../components/protocol-page";
import { PEcosystem } from "../components/p-ecosystem";
import { SimulationConsole } from "../components/simulation-console";
import { platformProject } from "../data/mock";
const key = projectKey(56, "0x" + "1".repeat(40)),
  other = projectKey(56, "0x" + "4".repeat(40));
const input = {
  name: "测试经济",
  symbol: "TEST",
  description: "",
  logo: "测",
  links: [],
};
beforeEach(() => {
  simulationStore.getState().reset();
  localStorage.clear();
});
afterEach(cleanup);
function active(s = simulationStore) {
  s.getState().seedScenario(key, "operating");
  s.getState().seedOperating(key, "contribution");
  return s;
}
const tab = (label: string) =>
  fireEvent.click(screen.getByRole("tab", { name: label }));
describe("final personal center", () => {
  it("includes Curve holdings and multiple Operating economies without summing token quantities", () => {
    const s = createSimulationStore();
    s.getState().trade(key, "buy", "100");
    s.getState().seedOperating(other, "multi");
    const r = personalRows(s.getState());
    expect(r.map((r) => r.key)).toEqual([key, other]);
    expect(r[0].balance).toBeGreaterThan(0n);
    expect(r[1].member?.lots).toHaveLength(3);
    expect(r[1].principal).toBe(8000n * UNIT);
  });
  it("preserves an economy after Curve holdings are sold", () => {
    const s = createSimulationStore();
    s.getState().trade(key, "buy", "100");
    s.getState().trade(key, "sell", "1");
    expect(personalRows(s.getState()).some((r) => r.key === key)).toBe(true);
  });
  it("shows independent lots and filters completed lots", () => {
    active();
    simulationStore.getState().seedOperating(key, "multi");
    render(<MyNexus />);
    tab("仓位");
    expect(screen.getAllByText(/仓位 0000/)).toHaveLength(3);
    fireEvent.change(screen.getByLabelText("仓位状态筛选"), {
      target: { value: "COMPLETED" },
    });
    expect(screen.queryByText(/仓位 0000/)).toBeNull();
    expect(screen.getByText("暂无仓位")).toBeDefined();
  });
  it("summarizes stake with a link to the existing execution page", () => {
    active();
    render(<MyNexus />);
    tab("质押");
    expect(screen.getByText("完整覆盖")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /Velqen/ }).getAttribute("href"),
    ).toContain("?tab=stake");
    expect(screen.queryByRole("button", { name: "确认质押" })).toBeNull();
  });
  it("shows settlement and claim history from the same ledger", () => {
    active();
    simulationStore.getState().settleDay(key);
    simulationStore.getState().claimReward(key, "1");
    render(<MyNexus />);
    tab("奖励");
    expect(screen.getByText("累计领取")).toBeDefined();
    expect(screen.getByText("历史结算")).toBeDefined();
    expect(screen.getByText("领取历史")).toBeDefined();
    expect(screen.getByText("0.85 SEA")).toBeDefined();
  });
  it("filters personal activity and excludes demo/backend lifecycle events", () => {
    active();
    simulationStore.getState().participate(key, "10");
    simulationStore.getState().stakeTokens(key, "1");
    render(<MyNexus />);
    tab("活动");
    fireEvent.change(screen.getByLabelText("活动类型筛选"), {
      target: { value: "PARTICIPATE" },
    });
    expect(screen.getByText(/参与.*新仓位已建立/)).toBeDefined();
    expect(screen.queryByText(/演示用户情景已加载/)).toBeNull();
  });
});
describe("creator studio permissions and outcomes", () => {
  it("uses a Curve-specific dashboard", () => {
    render(<CreatorStudio projectId="NX-0001" />);
    expect(screen.getByText("曲线进度")).toBeDefined();
    expect(screen.getByText("净储备")).toBeDefined();
    expect(
      screen.getByText(
        "当前为公开分析视图。仅创建者钱包可以更新 Logo 与链接。",
      ),
    ).toBeDefined();
  });
  it("uses an Operating-specific dashboard with ten modules", () => {
    active();
    render(<CreatorStudio projectId="NX-0001" />);
    expect(screen.getAllByRole("tab")).toHaveLength(10);
    expect(screen.getAllByText("仓位价值").length).toBeGreaterThan(0);
    expect(screen.queryByText("净储备")).toBeNull();
  });
  it("permits only creator Logo/links updates", () => {
    const s = createSimulationStore();
    const k = s.getState().createProject(input);
    const p = s.getState().projects[k];
    s.getState().updateMetadata(k, {
      logo: "新",
      links: [{ label: "官网", url: "https://example.com" }],
    });
    expect(s.getState().projects[k].name).toBe(p.name);
    expect(s.getState().projects[k].logo).toBe("新");
    expect(() =>
      s
        .getState()
        .updateMetadata(k, { logo: "新", links: [], name: "改名" } as never),
    ).toThrow(/仅允许/);
    expect(() =>
      s.getState().updateMetadata(key, { logo: "新", links: [] }),
    ).toThrow(/只有创建者/);
  });
  it("rejects unsafe links and incompatible Logo files without changing state", () => {
    const s = createSimulationStore(),
      k = s.getState().createProject(input);
    const p = s.getState().projects[k];
    expect(() =>
      s.getState().updateMetadata(k, {
        logo: "新",
        links: [{ label: "官网", url: "javascript:alert(1)" }],
      }),
    ).toThrow();
    expect(() =>
      s.getState().updateMetadata(k, {
        logo: "data:image/svg+xml;base64,AAAA",
        links: [],
      }),
    ).toThrow();
    expect(s.getState().projects[k]).toEqual(p);
  });
  it("has no fields to edit fixed metadata or economic parameters", () => {
    const k = simulationStore.getState().createProject(input);
    render(
      <CreatorStudio
        projectId={simulationStore.getState().projects[k].projectId}
      />,
    );
    expect(screen.getByLabelText("官网链接")).toBeDefined();
    expect(screen.queryByLabelText("项目名称")).toBeNull();
    expect(screen.queryByLabelText("手续费")).toBeNull();
  });
  it("keeps Treasury and Liquidity read-only", () => {
    active();
    render(<CreatorStudio projectId="NX-0001" />);
    tab("财库");
    expect(screen.getByText("财库余额")).toBeDefined();
    expect(screen.getByText("POL 价值")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /回购|添加 LP|执行财库/ }),
    ).toBeNull();
    tab("流动性");
    expect(screen.getByText("SEA/USDT")).toBeDefined();
  });
  it("derives Curve revenue from actual successful fees and preserves it across old-save fallback", () => {
    const s = createSimulationStore();
    const q = s.getState().trade(key, "buy", "100");
    expect(creatorCurveRevenue(s.getState(), key)).toBe(q.fee / 2n);
    s.setState({
      curves: {
        ...s.getState().curves,
        [key]: { ...s.getState().curves[key], creatorRevenue: undefined },
      },
    });
    const q2 = s.getState().trade(key, "buy", "100");
    expect(creatorCurveRevenue(s.getState(), key)).toBe((q.fee + q2.fee) / 2n);
  });
  it("reports Operating creator revenue without inventing a withdrawal engine", () => {
    active();
    simulationStore.getState().settleDay(key);
    simulationStore.getState().claimReward(key, "10");
    render(<CreatorStudio projectId="NX-0001" />);
    tab("收入");
    expect(screen.getAllByText("0.7125 SEA").length).toBeGreaterThan(0);
    expect(
      screen.getByText("可领取创建者收入").parentElement?.textContent,
    ).toContain("N/A");
  });
  it("derives objective trends and skips events without amount data", () => {
    active();
    simulationStore.getState().participate(key, "100");
    simulationStore.getState().stakeTokens(key, "10");
    simulationStore.getState().stakeTokens(key, "2", true);
    const events = simulationStore
      .getState()
      .activities.filter((a) => a.projectKey === key);
    expect(activityTrend(events, "positions")[0].value).toBe(100n * UNIT);
    expect(activityTrend(events, "stake")[0].value).toBe(8n * UNIT);
    expect(
      activityTrend(
        [{ ...events[0], type: "STAKE", displayValues: { summary: "旧摘要" } }],
        "stake",
      ),
    ).toEqual([]);
  });
});
describe("protocol transparency", () => {
  it("burns never restore mint capacity", () => {
    active();
    simulationStore.getState().settleDay(key);
    const before = supplyResult(
      simulationStore.getState(),
      simulationStore.getState().projects[key],
    );
    simulationStore.getState().claimReward(key, "10");
    const after = supplyResult(
      simulationStore.getState(),
      simulationStore.getState().projects[key],
    );
    expect(after.remaining).toBe(before.remaining);
    expect(after.total).toBe(before.total - parseAmount("0.75"));
    expect(after.burned).toBe(parseAmount("0.75"));
  });
  it("shows per-project supply and canonical contracts", () => {
    render(<ProtocolPage />);
    tab("供应");
    expect(screen.getByText("剩余发行容量")).toBeDefined();
    expect(screen.getByText("999,000,000 SEA")).toBeDefined();
    tab("合约");
    expect(
      screen.getByRole("button", {
        name: `复制合约地址 ${"0x" + "1".repeat(40)}`,
      }),
    ).toBeDefined();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });
  it("keeps price status separate from lifecycle", () => {
    render(<ProtocolPage />);
    tab("价格状态");
    expect(screen.getAllByText("价格保护").length).toBeGreaterThan(0);
    expect(screen.getAllByText("价格无效").length).toBeGreaterThan(0);
    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
  });
  it("projects final burn and POL events without backend logs", () => {
    active();
    simulationStore.getState().settleDay(key);
    simulationStore.getState().claimReward(key, "10");
    const e = publicOutcomes(simulationStore.getState());
    expect(
      e.some(
        (a) =>
          a.type === "SUPPLY_BURNED" &&
          a.displayValues.summary === "销毁 0.75 SEA",
      ),
    ).toBe(true);
    expect(e.some((a) => a.type === "POL_UPDATED")).toBe(true);
    expect(e.some((a) => a.type === "LIFECYCLE")).toBe(false);
  });
  it("shows the platform token with only NEXNS/USDT", () => {
    render(<PEcosystem />);
    expect(screen.getAllByText("NEXNS/USDT").length).toBeGreaterThan(0);
    expect(screen.queryByText("NEXNS/NEXNS")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: `复制合约地址 ${platformProject.tokenContract}`,
      }),
    ).toBeDefined();
  });
});
describe("demo readiness and persistence", () => {
  it.each(demoPresets.map((p) => p.id))(
    "applies %s preset through existing action services",
    (preset) => {
      const s = createSimulationStore();
      const k = applyDemoPreset(s.getState(), key, preset);
      const state = s.getState();
      if (preset === "fresh")
        expect(state.projects[k].creatorWallet).toBe(state.currentUser.wallet);
      if (preset === "seventyFive")
        expect(state.projects[k].curve.progress).toBe(0.75);
      if (preset === "completed")
        expect(
          state.operatingBooks[k].members[state.currentUser.wallet].lots[0]
            .status,
        ).toBe("COMPLETED");
      if (preset === "rewardReady")
        expect(
          BigInt(
            state.operatingBooks[k].members[state.currentUser.wallet].claimable,
          ),
        ).toBeGreaterThan(0n);
      expect(state.projects[k]).toBeDefined();
    },
  );
  it("migrates a Step 4 save by adding platform identity and preserving user finances", () => {
    const s = createSimulationStore();
    active(s);
    s.getState().settleDay(key);
    persistSnapshot(s.getState(), localStorage);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const pk = projectKey(56, platformProject.tokenContract);
    delete raw.projects[pk];
    delete raw.curves[pk];
    delete raw.operatingBooks[pk];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    const next = createSimulationStore();
    next.getState().hydrate(localStorage);
    expect(next.getState().projects[pk].isPlatformToken).toBe(true);
    expect(next.getState().operatingBooks[key]).toEqual(
      s.getState().operatingBooks[key],
    );
    expect(next.getState().exactBalances).toEqual(s.getState().exactBalances);
  });
  it("discards malformed activity or unsafe saved links", () => {
    const s = createSimulationStore();
    persistSnapshot(s.getState(), localStorage);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    raw.projects[key].links = [{ label: "官网", url: "javascript:alert(1)" }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    createSimulationStore().getState().hydrate(localStorage);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("keeps preset controls isolated in the demo console", () => {
    render(<SimulationConsole />);
    expect(
      screen.getByRole("button", { name: "08 · 已完成头寸" }),
    ).toBeDefined();
    cleanup();
    render(<ProtocolPage />);
    expect(
      screen.queryByRole("button", {
        name: /铸造|Mint|回购|Buyback|添加 LP|Add LP|强制迁移|Force Migration|结算当日/,
      }),
    ).toBeNull();
  });
  it("reset removes created projects and metadata and returns seeded identities", () => {
    const s = createSimulationStore();
    const k = s.getState().createProject(input);
    s.getState().updateMetadata(k, { logo: "新", links: [] });
    s.getState().reset();
    expect(s.getState().projects[k]).toBeUndefined();
    expect(
      s.getState().projects[projectKey(56, platformProject.tokenContract)]
        .isPlatformToken,
    ).toBe(true);
  });
});

describe("final result conservation and presentation", () => {
  it("repeated user presets preserve background aggregates without counting old user principal twice", () => {
    const s = active(createSimulationStore());
    s.getState().seedOperating(key, "full");
    const first = s.getState().projects[key].operating!.activePositionValue;
    s.getState().seedOperating(key, "full");
    expect(s.getState().projects[key].operating!.activePositionValue).toBe(
      first,
    );
    expect(s.getState().operatingBooks[key].base.activePrincipal).toBe("0");
  });
  it("records actual Treasury results without adding execution or budget state", () => {
    const s = active(createSimulationStore());
    s.getState().participate(key, "100");
    s.getState().settleDay(key);
    s.getState().claimReward(key, "1");
    const results = s.getState().operatingBooks[key].publicResults!;
    expect(results.at(-1)?.treasury).toBe((4100n * UNIT).toString());
    expect(results.at(-1)?.burned).toBe(parseAmount("0.075").toString());
    expect(results.at(-1)).not.toHaveProperty("budget");
    persistSnapshot(s.getState(), localStorage);
    const next = createSimulationStore();
    next.getState().hydrate(localStorage);
    expect(next.getState().operatingBooks[key].publicResults).toEqual(results);
  });
  it("formats units once and retains decimal market prices", () => {
    render(<PEcosystem />);
    expect(screen.getByText("0.49 USDT")).toBeDefined();
    expect(document.body.textContent).not.toContain("USDT USDT");
    cleanup();
    active();
    render(<CreatorStudio projectId="NX-0001" />);
    expect(document.body.textContent).not.toContain("USDT USDT");
  });
});
