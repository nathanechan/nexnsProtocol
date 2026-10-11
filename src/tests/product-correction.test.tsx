import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { LocaleProvider, LOCALE_KEY, translateText } from "../i18n/locale";
import NotFound from "../app/not-found";
import { AppShell } from "../components/app-shell";
import { ExplorePage } from "../components/explore-page";
import { MyNexus } from "../components/my-nexus";
import { CreatorStudio } from "../components/creator-studio";
import { ProtocolPage } from "../components/protocol-page";
import { TradePanel } from "../components/trade-panel";
import { OperatingActionForm } from "../components/operating-panels";
import { ProjectCard } from "../components/project-card";
import { discoverProjects } from "../data/discovery";
import { searchProjects } from "../data/search";
import { mockProjects, platformProject } from "../data/mock";
import { projectKey } from "../domain/identity";
import {
  simulationStore,
  createSimulationStore,
  persistSnapshot,
} from "../simulation/store";
import type { Project } from "../domain/models";
const key = projectKey(56, "0x" + "1".repeat(40));
vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
beforeEach(() => {
  localStorage.clear();
  simulationStore.getState().reset();
});
afterEach(cleanup);
const localized = (node: React.ReactNode, locale: "zh-CN" | "en" = "en") =>
  render(<LocaleProvider initialLocale={locale}>{node}</LocaleProvider>);
function operating() {
  simulationStore.getState().seedScenario(key, "operating");
  simulationStore.getState().seedOperating(key, "claimable");
  return simulationStore.getState().projects[key];
}
describe("production locale", () => {
  it.each([
    ["zh-CN", ["网络", "探索", "资产", "NEXNS", "协议"]],
    ["en", ["Network", "Explore", "Portfolio", "NEXNS", "Protocol"]],
  ] as const)("separates %s navigation", (locale, labels) => {
    localized(
      <AppShell>
        <div />
      </AppShell>,
      locale,
    );
    expect(
      within(screen.getByRole("navigation"))
        .getAllByRole("link")
        .map((n) => n.textContent),
    ).toEqual(labels);
  });
  it("persists and restores language without changing financial state", () => {
    const before = JSON.stringify(simulationStore.getState().exactBalances);
    const r = localized(
      <AppShell>
        <div />
      </AppShell>,
      "zh-CN",
    );
    fireEvent.change(screen.getByLabelText("语言"), {
      target: { value: "en" },
    });
    expect(localStorage.getItem(LOCALE_KEY)).toBe("en");
    expect(screen.getByRole("navigation").textContent).toContain("Portfolio");
    r.unmount();
    localized(
      <AppShell>
        <div />
      </AppShell>,
      "zh-CN",
    );
    expect(screen.getByLabelText("Language")).toBeDefined();
    expect(JSON.stringify(simulationStore.getState().exactBalances)).toBe(
      before,
    );
  });
  it("localizes Explore without development policy copy", async () => {
    localized(<ExplorePage />);
    await screen.findByText("Curve Stage — Top 100");
    expect(
      screen.getByPlaceholderText(
        "Contract, project ID, symbol, name or creator wallet",
      ),
    ).toBeDefined();
    expect(document.body.textContent).not.toMatch(
      /最多 100|当前展示排名|Simulation|模拟|经济体|探索项目/,
    );
  });
  it.each([
    ["Portfolio", <MyNexus key="portfolio" />],
    ["Studio", <CreatorStudio key="studio" projectId="NX-0001" />],
    ["Protocol", <ProtocolPage key="protocol" />],
  ])("fully translates %s tab labels", (_name, node) => {
    operating();
    localized(node);
    const labels = screen.getAllByRole("tab").map((n) => n.textContent);
    expect(labels.join("")).not.toMatch(/[\u4e00-\u9fff]/);
    for (const tab of screen.getAllByRole("tab")) {
      fireEvent.click(tab);
      expect(
        screen
          .getAllByRole("tab")
          .map((n) => n.textContent)
          .join(""),
      ).not.toMatch(/[\u4e00-\u9fff]/);
    }
    expect(document.body.textContent).not.toMatch(
      /Simulation|模拟|未建模|P Ecosystem|My NEXUS/,
    );
  });
  it("Chinese labels contain no English duplicates", () => {
    operating();
    localized(<MyNexus key="portfolio" />, "zh-CN");
    expect(screen.getAllByRole("tab").map((n) => n.textContent)).toEqual([
      "总览",
      "项目",
      "头寸",
      "质押",
      "奖励",
      "网络",
      "活动",
    ]);
    expect(translateText("贡献值 / Contribution Value", "zh-CN")).not.toContain(
      "Contribution",
    );
  });
  it("localizes dynamic status and historical brand without altering addresses", () => {
    expect(translateText("找到 3 个项目", "en")).toBe("3 projects found");
    expect(translateText("复制合约地址 0xABC", "en")).toBe(
      "Copy contract address 0xABC",
    );
    expect(translateText("NEXUS/USDT", "en")).toBe("NEXNS/USDT");
  });
});
describe("financial confirmation identity", () => {
  it.each(["buy", "sell", "participate", "stake", "unstake", "claim"] as const)(
    "identifies and localizes %s confirmation",
    async (action) => {
      let p: Project;
      let trigger: string;
      if (action === "buy" || action === "sell") {
        simulationStore.getState().trade(key, "buy", "100");
        p = simulationStore.getState().projects[key];
        localized(<TradePanel project={p} />);
        if (action === "sell")
          fireEvent.click(screen.getByRole("tab", { name: "Sell" }));
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: action === "buy" ? "10" : "1" },
        });
        trigger = (action === "buy" ? "Buy " : "Sell ") + p.symbol;
      } else {
        p = operating();
        localized(<OperatingActionForm project={p} kind={action} />);
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: "1" },
        });
        trigger = {
          participate: "Confirm participation",
          stake: "Confirm stake",
          unstake: "Confirm unstake",
          claim: "Confirm claim",
        }[action];
      }
      fireEvent.click(screen.getByRole("button", { name: trigger }));
      const dialog = screen.getByRole("dialog");
      const d = within(dialog);
      expect(d.getByText(p.name, { exact: true })).toBeDefined();
      expect(d.getByText(p.symbol, { exact: true })).toBeDefined();
      expect(
        d.getByRole("button", {
          name: "Copy contract address " + p.tokenContract,
        }),
      ).toBeDefined();
      expect(d.getByText("Action", { exact: true })).toBeDefined();
      expect(
        d.getByText(/Input amount|Participation amount|Claim amount/),
      ).toBeDefined();
      expect(dialog.textContent).not.toMatch(/模拟|确认|实际到账|合约地址/);
      if (action === "claim")
        expect(
          d.getByText("You receive").closest(".receive-result"),
        ).toBeTruthy();
    },
  );
});
describe("platform hierarchy", () => {
  it("pins Curve platform above higher progress with no ordinary rank", () => {
    const p = {
      ...platformProject,
      lifecycle: "CURVE_OPEN" as const,
      curve: { ...mockProjects[0].curve, progress: 0 },
    };
    const rows = discoverProjects(
      [...mockProjects.filter((x) => !x.isPlatformToken), p],
      "curve",
    );
    expect(rows[0].tokenContract).toBe(p.tokenContract);
    expect(
      rows
        .slice(1)
        .every(
          (x, i, a) => i === 0 || a[i - 1].curve.progress >= x.curve.progress,
        ),
    ).toBe(true);
    const { container } = localized(<ProjectCard project={p} rank={1} />);
    expect(screen.getByText("NEXNS · Platform Token")).toBeDefined();
    expect(container.querySelector(".rank")).toBeNull();
  });
  it("moves the platform from Curve into permanently first Operating position", () => {
    const pool = mockProjects.filter((p) => !p.isPlatformToken);
    expect(
      discoverProjects([...pool, platformProject], "curve").every(
        (p) => !p.isPlatformToken,
      ),
    ).toBe(true);
    for (const sort of [
      "tvl",
      "volume",
      "participants",
      "liquidity",
      "marketCap",
    ] as const) {
      const rows = discoverProjects(
        [...pool, platformProject],
        "operating",
        sort,
      );
      expect(rows[0].tokenContract).toBe(platformProject.tokenContract);
      expect(rows.slice(1)).toEqual(discoverProjects(pool, "operating", sort));
    }
  });
  it.each(["contract", "name", "symbol"] as const)(
    "preserves platform %s search",
    (field) => {
      const query = {
        contract: platformProject.tokenContract,
        name: platformProject.name,
        symbol: platformProject.symbol,
      }[field];
      expect(
        searchProjects(mockProjects, query).some(
          (r) => r.project.tokenContract === platformProject.tokenContract,
        ),
      ).toBe(true);
    },
  );
  it("updates legacy platform branding without replacing balances or lifecycle", () => {
    const s = createSimulationStore();
    const pk = projectKey(
      platformProject.chainId,
      platformProject.tokenContract,
    );
    s.getState().projects[pk].name = "NEXUS 平台经济";
    s.getState().projects[pk].symbol = "NEXUS";
    persistSnapshot(s.getState(), localStorage);
    const n = createSimulationStore();
    n.getState().hydrate(localStorage);
    expect(n.getState().projects[pk].symbol).toBe("NEXNS");
    expect(n.getState().exactBalances).toEqual(s.getState().exactBalances);
    expect(n.getState().projects[pk].lifecycle).toBe(
      s.getState().projects[pk].lifecycle,
    );
  });
});

describe("project identity preservation", () => {
  it("preserves a repeated legacy symbol and names while translating product labels", () => {
    expect(translateText("10 NEXUS", "en", ["NEXUS"])).toBe("10 NEXUS");
    expect(translateText("我的 NEXUS 余额", "en", ["NEXUS"])).toBe(
      "My NEXUS balance",
    );
    expect(translateText("伙伴经济体 · 工作室", "en", ["伙伴经济体"])).toBe(
      "伙伴经济体 · Studio",
    );
  });
});

it("localizes the not-found action and preserves safe recovery", () => {
  localized(<NotFound />);
  expect(
    screen.getByRole("link", { name: "Back to Explore" }).getAttribute("href"),
  ).toBe("/explore");
  expect(document.body.textContent).not.toMatch(/[\u4e00-\u9fff]|模拟/);
});

it("cleans legacy generated project metadata while preserving its exact balances", () => {
  const s = createSimulationStore();
  const k = s.getState().createProject({
    name: "演示新经济体",
    symbol: "DEMO",
    description: "用于外部产品演示的全新模拟经济体。",
    logo: "演",
    links: [],
  });
  s.getState().trade(k, "buy", "10");
  persistSnapshot(s.getState(), localStorage);
  const restored = createSimulationStore();
  restored.getState().hydrate(localStorage);
  expect(restored.getState().projects[k].symbol).toBe("NEW");
  expect(restored.getState().projects[k].name).toBe("新项目");
  expect(restored.getState().exactBalances).toEqual(s.getState().exactBalances);
  expect(restored.getState().curves[k]).toEqual(s.getState().curves[k]);
  expect(
    restored
      .getState()
      .activities.filter((a) => a.projectKey === k)
      .map((a) => a.displayValues.summary)
      .join(" "),
  ).not.toContain("DEMO");
});
