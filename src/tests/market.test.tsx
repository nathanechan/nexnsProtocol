import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import {
  marketRows,
  createMarketDataService,
  marketRow,
  marketSorts,
} from "../data/market";
import {
  marketPrice,
  marketChange,
  compactMarketNumber,
} from "../product/market-format";
import { MarketPage } from "../components/market-page";
import { LocaleProvider } from "../i18n/locale";
import { mockProjects, platformProject } from "../data/mock";
const routing = vi.hoisted(() => ({ replace: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routing.replace }),
  useSearchParams: () => new URLSearchParams(routing.query),
}));
beforeEach(() => {
  routing.query = "";
  routing.replace.mockClear();
  localStorage.clear();
});
afterEach(cleanup);
const show = (
  section: "markets" | "launch" | "live",
  service = createMarketDataService(mockProjects),
  locale: "zh-CN" | "en" = "en",
) =>
  render(
    <LocaleProvider initialLocale={locale}>
      <MarketPage section={section} service={service} />
    </LocaleProvider>,
  );
describe("market read models", () => {
  it("sorts Live Staked by monetary value, independently of token quantity", () => {
    const fixtures = mockProjects
      .filter((p) => p.lifecycle === "OPERATING" && !p.isPlatformToken)
      .slice(0, 2);
    const projects = fixtures.map((p, i) => ({
      ...p,
      operating: {
        ...p.operating!,
        totalStaked: i ? 200 : 100,
        tokenPrice: i ? 1 : 10,
        activeParticipants: i ? 50 : 20,
      },
    }));
    expect(marketRows(projects, "live", "staked").map((r) => r.value)).toEqual([
      1000, 200,
    ]);
    expect(marketRows(projects, "live", "price").map((r) => r.price)).toEqual([
      10, 1,
    ]);
    expect(
      marketRows(projects, "live", "users").map((r) => r.participants),
    ).toEqual([50, 20]);
    expect(marketSorts.live).toEqual(["price", "staked", "users"]);
  });
  it.each(["CURVE_OPEN", "OPERATING"] as const)(
    "pins %s platform without mutating projects",
    (lifecycle) => {
      const projects = [
        ...mockProjects.filter((p) => !p.isPlatformToken),
        { ...platformProject, lifecycle },
      ];
      const before = JSON.stringify(projects);
      const own = lifecycle === "CURVE_OPEN" ? "launch" : "live",
        other = lifecycle === "CURVE_OPEN" ? "live" : "launch";
      for (const sort of marketSorts.markets)
        expect(marketRows(projects, "markets", sort)[0].platform).toBe(true);
      for (const sort of marketSorts[own])
        expect(marketRows(projects, own, sort)[0].platform).toBe(true);
      expect(
        marketRows(projects, other, "volume").some((r) => r.platform),
      ).toBe(false);
      expect(JSON.stringify(projects)).toBe(before);
    },
  );
  it("keeps migration outside public lists and retains canonical duplicate identities", () => {
    for (const section of ["markets", "launch", "live"] as const) {
      const rows = marketRows(mockProjects, section, "volume");
      expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
      expect(
        rows.every((r) => ["CURVE_OPEN", "OPERATING"].includes(r.stage)),
      ).toBe(true);
    }
    const row = marketRow(mockProjects[0]);
    expect(row.href).toBe(
      `/economy/${mockProjects[0].chainId}/${mockProjects[0].tokenContract}`,
    );
    expect(row.remaining).toBe(
      mockProjects[0].curve.targetReserve - mockProjects[0].curve.netReserve,
    );
    expect(row.change).toBeNull();
  });
  it("orders mixed markets by actual volume and keeps missing price changes last", () => {
    const volume = marketRows(mockProjects, "markets", "volume")
      .filter((r) => !r.platform)
      .map((r) => r.volume!);
    expect(volume).toEqual([...volume].sort((a, b) => b - a));
    const change = marketRows(mockProjects, "markets", "change");
    const firstMissing = change.findIndex((r) => r.change === null);
    expect(change.slice(firstMissing).every((r) => r.change === null)).toBe(
      true,
    );
  });
  it("formats missing/zero/small prices and signed changes without invented values", () => {
    expect(marketPrice(0.0842)).toBe("$0.0842");
    expect(marketPrice(1.24)).toBe("$1.24");
    expect(marketPrice(0)).toBe("$0.00");
    expect(marketPrice(null)).toBe("N/A");
    expect(marketPrice(NaN)).toBe("N/A");
    expect(marketChange(0.0324)).toBe("+3.24%");
    expect(marketChange(-0.0182)).toBe("−1.82%");
    expect(marketChange(null)).toBe("N/A");
    expect(compactMarketNumber(3820000, true)).toBe("$3.82M");
    expect(compactMarketNumber(12400)).toBe("12.4K");
  });
});
describe("market presentation", () => {
  it.each(["zh-CN", "en"] as const)(
    "shows four comparison columns without detail metrics in %s",
    async (locale) => {
      const { container } = show("live", undefined, locale);
      await waitFor(() =>
        expect(
          container.querySelectorAll(".market-row").length,
        ).toBeGreaterThan(0),
      );
      expect(
        [...container.querySelectorAll(".market-columns > span")].map(
          (e) => e.textContent,
        ),
      ).toEqual(
        locale === "en"
          ? ["Token", "Price", "Staked", "Users"]
          : ["项目", "价格", "质押", "人数"],
      );
      for (const row of container.querySelectorAll(".market-row")) {
        expect(row.children).toHaveLength(4);
        expect(
          row.querySelector(
            ".market-metric,.market-volume,.market-liquidity,.stake-sparkline",
          ),
        ).toBeNull();
        const value = row.querySelector(
          ".market-staked .market-value",
        )!.textContent!;
        expect(value === "N/A" || value.startsWith("$")).toBe(true);
        expect(row.querySelector(".market-staked small")).toBeNull();
      }
    },
  );
  it.each(["markets", "launch", "live"] as const)(
    "renders %s as native linked rows with labelled sort",
    async (section) => {
      show(section);
      await waitFor(() =>
        expect(document.querySelectorAll(".market-row").length).toBeGreaterThan(
          0,
        ),
      );
      expect(document.querySelectorAll(".economy-card").length).toBe(0);
      const link = document.querySelector<HTMLAnchorElement>(".market-row")!;
      expect(link.href).toContain("/economy/56/0x");
      expect(link.tabIndex).toBe(0);
      expect(screen.getByRole("combobox", { name: "Sort by" })).toBeDefined();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: section === "live" ? "staked" : "volume" },
      });
      expect(routing.replace).toHaveBeenCalledWith(
        `/${section}?sort=${section === "live" ? "staked" : "volume"}`,
        {
          scroll: false,
        },
      );
      expect(document.querySelector("input[type=search]")).toBeNull();
    },
  );
  it("provides compact loading rows, retry and empty results", async () => {
    let reject!: () => void;
    const service = {
      list: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((_, r) => {
              reject = () => r(new Error("offline"));
            }),
        )
        .mockResolvedValueOnce([]),
    };
    show("markets", service);
    expect(
      screen.getByRole("status", { name: "Loading markets" }),
    ).toBeDefined();
    expect(document.querySelectorAll(".market-skeleton")).toHaveLength(10);
    reject();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No projects");
    expect(service.list).toHaveBeenCalledTimes(2);
  });
  it("localizes labels while retaining user identities", async () => {
    show("launch", undefined, "zh-CN");
    await waitFor(() =>
      expect(document.querySelectorAll(".market-row").length).toBeGreaterThan(
        0,
      ),
    );
    expect(screen.getByRole("heading", { name: "发行" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "排序方式" })).toBeDefined();
    expect(document.querySelector(".market-surface")?.textContent).not.toMatch(
      /Curve Progress|Platform Token|Remaining|Participants/,
    );
  });
});
