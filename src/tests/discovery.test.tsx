import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { mockProjects } from "../data/mock";
import { discoverProjects, parseExploreState } from "../data/discovery";
import {
  createEconomyDataService,
  economyService,
  buildNetworkSnapshot,
} from "../data/service";
import { projectRoute } from "../domain/identity";
import type { Address, Project } from "../domain/models";
import { ProductTabs } from "../components/product-tabs";
import { ProjectCard } from "../components/project-card";
import { SearchPanel } from "../components/search-panel";
import { GlobalSearch } from "../components/global-search";
import { ExplorePage } from "../components/explore-page";
import { NetworkPage } from "../components/network-page";
import { ProjectShell } from "../components/project-shell";
import { simulationStore } from "../simulation/store";
const routing = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  query: "stage=curve&sort=progress",
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/launch",
  useRouter: () => ({ push: routing.push, replace: routing.replace }),
  useSearchParams: () => new URLSearchParams(routing.query),
}));
vi.mock("../components/curve-chart", () => ({
  CurveChart: () => <div>曲线价格与发行进度</div>,
}));
beforeEach(() => {
  vi.clearAllMocks();
  routing.query = "stage=curve&sort=progress";
  simulationStore.getState().reset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function many(stage: "curve" | "operating", count = 130): Project[] {
  return Array.from({ length: count }, (_, i) => ({
    ...structuredClone(mockProjects[stage === "curve" ? 0 : 3]),
    projectId: `SYN-${i}`,
    tokenContract: `0x${(i + 8000).toString(16).padStart(40, "0")}` as Address,
    curve: { ...mockProjects[0].curve, progress: i / count },
    operating: { ...mockProjects[3].operating!, tvl: 1000 + i },
  }));
}
describe("discovery rules", () => {
  it("sorts Curve progress descending by default", () => {
    const r = discoverProjects(mockProjects, "curve");
    expect(
      r.every((p, i) => i === 0 || r[i - 1].curve.progress >= p.curve.progress),
    ).toBe(true);
    expect(r.every((p) => p.lifecycle === "CURVE_OPEN")).toBe(true);
  });
  it("sorts Operating TVL descending by default", () => {
    const discovered = discoverProjects(mockProjects, "operating");
    expect(discovered[0].isPlatformToken).toBe(true);
    const r = discovered.filter((p) => !p.isPlatformToken);
    expect(
      r.every((p, i) => i === 0 || r[i - 1].operating!.tvl >= p.operating!.tvl),
    ).toBe(true);
  });
  it.each(["curve", "operating"] as const)(
    "caps %s at 100 without mutating source",
    (stage) => {
      const p = many(stage);
      expect(discoverProjects(p, stage)).toHaveLength(100);
      expect(p[0].projectId).toBe("SYN-0");
    },
  );
  it("uses canonical identity for stable ties regardless of input order", () => {
    const a = {
      ...mockProjects[0],
      tokenContract: mockProjects[3].tokenContract,
    };
    const b = { ...mockProjects[0] };
    expect(
      discoverProjects([a, b], "curve").map((p) => p.tokenContract),
    ).toEqual(discoverProjects([b, a], "curve").map((p) => p.tokenContract));
  });
  it("uses volume then newest as Curve tie breakers", () => {
    const a = {
      ...mockProjects[0],
      tokenContract: mockProjects[3].tokenContract,
      curve: { ...mockProjects[0].curve, volume24h: 5000 },
    };
    expect(
      discoverProjects([mockProjects[0], a], "curve")[0].tokenContract,
    ).toBe(a.tokenContract);
  });
  it("uses active participants as Operating tie breaker", () => {
    const a = {
      ...mockProjects[3],
      tokenContract: mockProjects[4].tokenContract,
      operating: { ...mockProjects[3].operating!, activeParticipants: 900 },
    };
    expect(
      discoverProjects([mockProjects[3], a], "operating")[0].tokenContract,
    ).toBe(a.tokenContract);
  });
  it("places missing market cap after valid zero", () => {
    const a = {
      ...mockProjects[3],
      operating: { ...mockProjects[3].operating!, marketCap: null },
    };
    const b = {
      ...mockProjects[4],
      operating: { ...mockProjects[4].operating!, marketCap: 0 },
    };
    expect(
      discoverProjects([a, b], "operating", "marketCap")[0].projectId,
    ).toBe(b.projectId);
  });
  it("parses shareable stage, sort and search state safely", () => {
    expect(
      parseExploreState(
        new URLSearchParams("stage=operating&sort=liquidity&q=SEA"),
      ),
    ).toEqual({ stage: "operating", sort: "liquidity", query: "SEA" });
    expect(
      parseExploreState(new URLSearchParams("stage=curve&sort=tvl")).sort,
    ).toBe("progress");
    expect(parseExploreState(new URLSearchParams("stage=wrong")).stage).toBe(
      "curve",
    );
  });
  it("searches projects outside the capped pool", async () => {
    const p = many("curve");
    const service = createEconomyDataService(p);
    expect(await service.discovery("curve", "progress")).not.toContain(p[0]);
    expect(
      (await service.search(p[0].tokenContract))[0].project.projectId,
    ).toBe(p[0].projectId);
  });
  it("includes migration projects in search, not discovery", async () => {
    const r = await economyService.search("NX-0002");
    expect(r[0].project.lifecycle).toBe("MIGRATION_READY");
    expect(
      discoverProjects(mockProjects, "curve").some(
        (p) => p.projectId === "NX-0002",
      ),
    ).toBe(false);
  });
  it("returns N/A total when any Operating summary is missing", () => {
    expect(
      buildNetworkSnapshot([{ ...mockProjects[3], operating: null }], []).tvl,
    ).toBeNull();
    const snapshot = buildNetworkSnapshot(
      [{ ...mockProjects[3], operating: null }],
      [],
    );
    expect(snapshot.participants).toBeNull();
    expect(snapshot.volume24h).toBeNull();
  });
});
describe("public presentation", () => {
  it.each([
    ["CURVE_OPEN", "曲线交易"],
    ["MIGRATION_READY", "曲线已完成，等待迁移"],
    ["MIGRATING", "迁移处理中"],
    ["OPERATING", "仓位记录"],
  ] as const)("renders %s shell", (state, label) => {
    render(
      <ProjectShell
        initialProject={mockProjects.find((p) => p.lifecycle === state)!}
      />,
    );
    expect(screen.getByText(label)).toBeDefined();
  });
  it("Operating tabs expose connected ARIA semantics and structured previews", () => {
    render(<ProjectShell initialProject={mockProjects[3]} />);
    const tabs = screen.getAllByRole("tab");
    expect(
      within(screen.getByRole("tablist", { name: "终端操作" })).getAllByRole(
        "tab",
      ),
    ).toHaveLength(3);
    expect(tabs.length).toBeGreaterThan(4);
    fireEvent.click(screen.getByRole("tab", { name: "贡献" }));
    expect(
      screen.getByRole("tab", { name: "贡献" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      document
        .getElementById(
          screen
            .getByRole("tab", { name: "贡献" })
            .getAttribute("aria-controls")!,
        )
        ?.getAttribute("aria-labelledby"),
    ).toBe(screen.getByRole("tab", { name: "贡献" }).id);
    expect(screen.getByText("网络权重")).toBeDefined();
  });
  it("cards expose readable mobile identity and full-contract copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ProjectCard project={mockProjects[0]} />);
    expect(screen.getByText("BSC")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      projectRoute(mockProjects[0]),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `复制合约地址 ${mockProjects[0].tokenContract}`,
      }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(mockProjects[0].tokenContract),
    );
  });
  it("never exposes backend execution controls", () => {
    render(<ProjectShell initialProject={mockProjects[3]} />);
    expect(
      screen.queryByRole("button", {
        name: /Buyback|Add LP|Mint|Force Migration|Oracle|Execute|回购|执行迁移/,
      }),
    ).toBeNull();
    expect(screen.queryByText("85%")).toBeNull();
  });
  it("supports arrow-key tab activation", () => {
    function Harness() {
      const [value, setValue] = React.useState("a");
      return (
        <ProductTabs
          label="阶段"
          items={[
            { value: "a", label: "曲线" },
            { value: "b", label: "运行" },
          ]}
          value={value}
          onChange={setValue}
        >
          当前阶段
        </ProductTabs>
      );
    }
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "曲线" }), {
      key: "ArrowRight",
    });
    expect(
      screen.getByRole("tab", { name: "运行" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "运行" }),
    );
  });
  it("shows Network empty and data-error states distinctly", async () => {
    const service = createEconomyDataService([]);
    const view = render(<NetworkPage service={service} />);
    expect(await screen.findByText("网络尚无项目")).toBeDefined();
    view.unmount();
    render(
      <NetworkPage
        service={{
          ...service,
          network: async () => {
            throw new Error("offline");
          },
        }}
      />,
    );
    expect(await screen.findByText("数据加载失败")).toBeDefined();
  });
});
describe("shared search experience", () => {
  it("shows loading and duplicate-symbol results with distinct contracts", async () => {
    render(<SearchPanel query="SEA" onQueryChange={() => {}} />);
    expect(screen.getByRole("status", { name: "正在加载" })).toBeDefined();
    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.getAttribute("href"))).size).toBe(2);
    expect(screen.getAllByText("BSC · 56")).toHaveLength(2);
  });
  it("supports duplicate name search", async () => {
    render(<SearchPanel query="澄海经济" onQueryChange={() => {}} />);
    expect(await screen.findAllByRole("link")).toHaveLength(2);
  });
  it("supports keyboard results and Enter navigation", async () => {
    render(<SearchPanel query="NX-0002" onQueryChange={() => {}} />);
    const link = await screen.findByRole("link");
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(link);
    fireEvent.keyDown(link, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });
    expect(routing.push).toHaveBeenCalledWith(projectRoute(mockProjects[1]));
  });
  it("shows exact contract matching clearly", async () => {
    render(
      <SearchPanel
        query={mockProjects[0].tokenContract}
        onQueryChange={() => {}}
      />,
    );
    expect(await screen.findByText("合约精准匹配")).toBeDefined();
  });
  it("shows no-results and source errors distinctly", async () => {
    const view = render(
      <SearchPanel query="unknown" onQueryChange={() => {}} />,
    );
    expect(await screen.findByText("未找到项目")).toBeDefined();
    view.unmount();
    render(
      <SearchPanel
        query="SEA"
        onQueryChange={() => {}}
        service={{
          search: async () => {
            throw new Error("offline");
          },
        }}
      />,
    );
    expect(await screen.findByText("数据加载失败")).toBeDefined();
  });
  it("global and Explore search call the same service", async () => {
    routing.query = "stage=curve&q=SEA";
    const spy = vi.spyOn(economyService, "search");
    render(<ExplorePage />);
    await screen.findAllByText("符号匹配");
    render(<GlobalSearch />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("searchbox"), {
      target: { value: "SEA" },
    });
    await within(dialog).findAllByRole("link");
    expect(
      spy.mock.calls.filter((call) => call[0] === "SEA").length,
    ).toBeGreaterThanOrEqual(2);
  });
  it("Explore stage switch writes URL state with default sort", () => {
    render(<ExplorePage />);
    fireEvent.click(screen.getByRole("tab", { name: "运行中" }));
    expect(routing.push).toHaveBeenCalledWith(
      "/explore?stage=operating&sort=tvl",
      { scroll: false },
    );
  });
});
