import React from "react";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { simulationStore, createSimulationStore } from "../simulation/store";
import { projectKey, projectRoute } from "../domain/identity";
import { UNIT, parseAmount } from "../domain/economics/amount";
import { personalRows } from "../product/read-model";
import { portfolioSummary } from "../product/portfolio";
import { MyNexus } from "../components/my-nexus";
import { ProtocolPage } from "../components/protocol-page";
import { CreatorStudio } from "../components/creator-studio";
import { PEcosystem } from "../components/p-ecosystem";
import { AppShell } from "../components/app-shell";
import { LocaleProvider } from "../i18n/locale";
import { platformProject } from "../data/mock";
const key = projectKey(56, "0x" + "1".repeat(40));
beforeEach(() => {
  localStorage.clear();
  simulationStore.getState().reset();
});
afterEach(cleanup);
const tab = (name: string) =>
  fireEvent.click(screen.getByRole("tab", { name }));
const seed = () => {
  simulationStore.getState().seedScenario(key, "operating");
  simulationStore.getState().seedOperating(key, "contribution");
  simulationStore.getState().settleDay(key);
};
describe("secondary product read models", () => {
  it("values each asset independently without mutating balances or lots", () => {
    const s = createSimulationStore();
    s.getState().trade(key, "buy", "100");
    const before = JSON.stringify(s.getState().exactBalances),
      rows = personalRows(s.getState()),
      result = portfolioSummary(rows);
    expect(result.tokens).toBe(
      (rows[0].balance * parseAmount(String(rows[0].p.curve.curvePrice))) /
        UNIT,
    );
    expect(result.activeProjects).toBe(1);
    expect(result.principal).toBe(0n);
    expect(JSON.stringify(s.getState().exactBalances)).toBe(before);
  });
  it("shows unavailable valuation rather than zero when a held asset has no valid price", () => {
    seed();
    const rows = personalRows(simulationStore.getState());
    const r = rows.find((r) => r.key === key)!;
    r.book = {
      ...r.book!,
      prices: { ...r.book!.prices, status: "PRICE_INVALID" },
    };
    const result = portfolioSummary(rows);
    expect(result.staked).toBeNull();
    expect(result.claimable).toBeNull();
    expect(result.principal).toBe(r.principal);
  });
  it("includes a created project with no funded assets and no active project inflation", () => {
    const s = createSimulationStore();
    const k = s.getState().createProject({
      name: "Creator",
      symbol: "CRTR",
      description: "",
      logo: "C",
      links: [],
    });
    const rows = personalRows(s.getState());
    expect(rows.some((r) => r.key === k)).toBe(true);
    expect(portfolioSummary(rows).activeProjects).toBe(0);
  });
});
describe("secondary product boundaries", () => {
  it("renders five compact summary results and native project terminal links", () => {
    seed();
    const { container } = render(<MyNexus />);
    expect(container.querySelectorAll(".summary-strip > div")).toHaveLength(5);
    expect(
      container
        .querySelector(".portfolio-project-rows a")
        ?.getAttribute("href"),
    ).toBe(projectRoute(simulationStore.getState().projects[key]));
    expect(container.querySelector(".personal-projects .card")).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(7);
  });
  it("routes claimable rewards into the canonical Claim action without duplicating execution", () => {
    seed();
    render(<MyNexus />);
    tab("奖励");
    expect(
      screen
        .getAllByRole("link")
        .some(
          (a) =>
            a.getAttribute("href") ===
            projectRoute(simulationStore.getState().projects[key]) +
              "?tab=claim",
        ),
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: /确认领取|Claim rewards/ }),
    ).toBeNull();
  });
  it("keeps completed lots available with zero active principal", () => {
    simulationStore.getState().seedScenario(key, "operating");
    simulationStore.getState().seedOperating(key, "multi");
    const wallet = simulationStore.getState().currentUser.wallet,
      b = simulationStore.getState().operatingBooks[key];
    simulationStore.setState({
      operatingBooks: {
        ...simulationStore.getState().operatingBooks,
        [key]: {
          ...b,
          members: {
            ...b.members,
            [wallet]: {
              ...b.members[wallet],
              lots: b.members[wallet].lots.map((l) => ({
                ...l,
                status: "COMPLETED" as const,
                used: l.capacity,
              })),
            },
          },
        },
      },
    });
    render(<MyNexus />);
    tab("仓位");
    fireEvent.change(screen.getByLabelText("仓位状态筛选"), {
      target: { value: "COMPLETED" },
    });
    expect(
      screen.getAllByText("已完成").filter((e) => e.tagName === "TD"),
    ).toHaveLength(3);
  });
  it("limits Protocol to six result modules without execution controls", () => {
    render(<ProtocolPage />);
    expect(screen.getAllByRole("tab").map((e) => e.textContent)).toEqual([
      "总览",
      "合约",
      "供应",
      "结算",
      "价格状态",
      "公开事件",
    ]);
    for (const name of [
      "总览",
      "合约",
      "供应",
      "结算",
      "价格状态",
      "公开事件",
    ]) {
      tab(name);
      expect(
        screen.queryByRole("button", {
          name: /结算当日|执行|回购|添加 LP|Oracle|Mint/,
        }),
      ).toBeNull();
    }
  });
  it.each(["curve", "operating"] as const)(
    "keeps the %s NEXNS page contextual and links the same terminal",
    (stage) => {
      const k = projectKey(56, platformProject.tokenContract);
      simulationStore
        .getState()
        .seedScenario(k, stage === "curve" ? "fresh" : "operating");
      render(<PEcosystem />);
      expect(
        screen
          .getByRole("link", { name: "进入 NEXNS 终端 ↗" })
          .getAttribute("href"),
      ).toBe(projectRoute(simulationStore.getState().projects[k]));
      expect(screen.queryByText("NEXNS/NEXNS")).toBeNull();
      expect(screen.getByText("已销毁")).toBeDefined();
      expect(
        screen.queryByRole("button", { name: /买入|参与|确认质押/ }),
      ).toBeNull();
    },
  );
  it("retains ten Studio modules with read-only Treasury and canonical public navigation", () => {
    seed();
    render(<CreatorStudio projectId="NX-0001" />);
    expect(screen.getAllByRole("tab")).toHaveLength(10);
    expect(
      screen.getByRole("link", { name: "查看项目 ↗" }).getAttribute("href"),
    ).toBe(projectRoute(simulationStore.getState().projects[key]));
    tab("财库");
    expect(screen.getByText("财库余额")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /执行|回购|添加 LP|Mint/ }),
    ).toBeNull();
    tab("代币");
    expect(screen.getByText("代币名称")).toBeDefined();
  });
  it("permits only logo and links across fixed field attempts", () => {
    const s = createSimulationStore(),
      k = s.getState().createProject({
        name: "Creator",
        symbol: "CRTR",
        description: "",
        logo: "C",
        links: [],
      }),
      p = s.getState().projects[k];
    for (const field of [
      "name",
      "symbol",
      "fees",
      "supply",
      "beneficiaries",
      "nameEn",
    ]) {
      expect(() =>
        s.getState().updateMetadata(k, {
          logo: "C",
          links: [],
          [field]: "changed",
        } as never),
      ).toThrow();
    }
    expect(s.getState().projects[k]).toEqual(p);
  });
  it.each(["zh-CN", "en"] as const)(
    "keeps secondary menu and Create outside %s primary navigation",
    (locale) => {
      render(
        <LocaleProvider initialLocale={locale}>
          <AppShell>
            <MyNexus />
          </AppShell>
        </LocaleProvider>,
      );
      const nav = screen.getByRole("navigation", {
        name: locale === "en" ? "Primary navigation" : "主导航",
      });
      expect(nav.querySelectorAll("a")).toHaveLength(3);
      expect(nav.querySelector('a[href="/create"]')).toBeNull();
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "en" ? "Product menu" : "产品菜单",
        }),
      );
      for (const href of ["/nexns", "/protocol", "/create"]) {
        expect(
          document.querySelector(`#product-menu a[href="${href}"]`),
        ).not.toBeNull();
      }
    },
  );
});
