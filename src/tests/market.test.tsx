import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import {
  discoverRows,
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
import { simulationStore } from "../simulation/store";
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
    expect(marketSorts.live).toEqual([
      "price",
      "change",
      "staked",
      "volume",
      "users",
      "newest",
    ]);
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
    "shows comparison columns with price trend without detail metrics in %s",
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
          ? [
              "Token",
              "Trend",
              "Price",
              "Change",
              "24h volume",
              "Staked",
              "Addresses",
            ]
          : ["项目", "走势", "价格", "涨跌", "24h 成交量", "质押", "地址"],
      );
      expect(
        container
          .querySelector("[role=columnheader]")
          ?.getAttribute("aria-sort"),
      ).toBe("none");
      for (const row of container.querySelectorAll(".market-row")) {
        const source = mockProjects.find((p) =>
          row.getAttribute("href")?.endsWith(p.tokenContract),
        );
        expect(row.querySelector("[data-token-symbol]")?.textContent).toBe(
          source!.symbol,
        );
        expect(row.querySelector("[data-token-name]")).toBeNull();
        expect(row.children).toHaveLength(7);
        expect(
          row.querySelector(
            ".market-metric,.market-liquidity,.stake-sparkline",
          ),
        ).toBeNull();
        expect(row.querySelector(".market-volume")?.textContent).toBe(
          compactMarketNumber(source!.operating!.volume24h, true),
        );
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
      if (section === "markets") {
        fireEvent.change(screen.getByRole("combobox"), {
          target: { value: "volume" },
        });
        expect(routing.replace).toHaveBeenCalledWith("/markets?sort=volume", {
          scroll: false,
        });
      } else {
        expect(screen.getByRole("combobox")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Price" }));
        expect(routing.replace).toHaveBeenCalledWith(
          `/${section}?sort=price&dir=desc`,
          { scroll: false },
        );
      }
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
    expect(screen.getByRole("tab", { name: "热门" })).toBeDefined();
    expect(document.querySelector(".market-surface")?.textContent).not.toMatch(
      /Curve Progress|Platform Token|Remaining|Participants/,
    );
  });
});

describe("discovery interactions", () => {
  it("keeps focus prices and row prices synchronized on clock-only updates", async () => {
    const before = simulationStore.getState();
    const now = Date.now();
    try {
      act(() => simulationStore.getState().advanceMarket(now));
      const view = render(
        <LocaleProvider initialLocale="en">
          <MarketPage section="live" />
        </LocaleProvider>,
      );
      await waitFor(() =>
        expect(
          view.container.querySelectorAll(".market-focus-card"),
        ).toHaveLength(3),
      );
      const card = view.container.querySelectorAll(".market-focus-card")[2];
      const href = card.getAttribute("href");
      const initial = card
        .querySelector(".amount-tick")!
        .getAttribute("data-value");
      const revision = simulationStore.getState().revision;
      act(() => simulationStore.getState().advanceMarket(now + 600_000));
      await waitFor(() => {
        const updated = card
          .querySelector(".amount-tick")!
          .getAttribute("data-value");
        expect(updated).not.toBe(initial);
        expect(
          view.container
            .querySelector(
              `.market-row[href="${href}"] .market-price .amount-tick`,
            )
            ?.getAttribute("data-value"),
        ).toBe(updated);
      });
      expect(simulationStore.getState().revision).toBe(revision);
    } finally {
      simulationStore.setState(before, true);
    }
  });
  it.each(["launch", "live"] as const)(
    "sorts all numeric headers both directions in %s",
    (section) => {
      const rows = marketRows(mockProjects, section, "price").filter(
        (r) => !r.platform,
      );
      for (const sort of [
        "price",
        "change",
        section === "launch" ? "progress" : "staked",
        "users",
      ]) {
        const down = discoverRows(rows, section, "all", [], sort, "desc");
        const up = discoverRows(rows, section, "all", [], sort, "asc");
        const value = (r: (typeof rows)[number]) =>
          sort === "staked"
            ? r.value
            : sort === "users"
              ? r.participants
              : sort === "price"
                ? r.price
                : sort === "change"
                  ? r.change
                  : r.progress;
        for (const [list, factor] of [
          [down, 1],
          [up, -1],
        ] as const) {
          const numbers = list
            .map(value)
            .filter((v): v is number => v !== null);
          expect(numbers).toEqual(
            [...numbers].sort((a, b) => (b - a) * factor),
          );
        }
      }
    },
  );
  it("uses creation versus migration time for New and deterministic Hot", () => {
    const rows = marketRows(mockProjects, "live", "price")
      .filter((r) => !r.platform)
      .slice(0, 2)
      .map((r, i) => ({
        ...r,
        createdAt: i ? "2026-01-01" : "2026-02-01",
        operatingAt: i ? "2026-04-01" : "2026-03-01",
      }));
    expect(discoverRows(rows, "live", "new", [], null, "desc")[0].key).toBe(
      rows[1].key,
    );
    expect(discoverRows(rows, "launch", "new", [], null, "desc")[0].key).toBe(
      rows[0].key,
    );
    expect(discoverRows(rows, "live", "hot", [], null, "desc")).toEqual(
      discoverRows([...rows].reverse(), "live", "hot", [], null, "desc"),
    );
  });
  it("preserves canonical watch identity across stages and composes search", () => {
    const row = marketRows(mockProjects, "launch", "price")[0];
    expect(
      discoverRows(
        [row],
        "launch",
        "watchlist",
        [row.key],
        "price",
        "asc",
        row.contract,
      ),
    ).toHaveLength(1);
    expect(
      discoverRows(
        [{ ...row, stage: "OPERATING" }],
        "live",
        "watchlist",
        [row.key],
        null,
        "desc",
      )[0].key,
    ).toBe(row.key);
    expect(
      discoverRows([row], "launch", "watchlist", [], null, "desc"),
    ).toHaveLength(0);
  });
  it("saves and restores watchlist separately from financial state", async () => {
    const view = show("launch");
    const add = (
      await screen.findAllByRole("button", { name: "Add to watchlist" })
    )[0];
    fireEvent.click(add);
    const stored = JSON.parse(localStorage.getItem("nexns-watchlist-v1")!);
    expect(stored).toHaveLength(1);
    view.unmount();
    show("launch");
    expect(
      await screen.findByRole("button", { name: "Remove from watchlist" }),
    ).toBeDefined();
  });
  it("toggles a selected header to ascending with accessible state", async () => {
    routing.query = "sort=price&dir=desc";
    show("launch");
    await screen.findByRole("button", { name: "Price" });
    expect(
      screen
        .getByRole("columnheader", { name: "Price" })
        .getAttribute("aria-sort"),
    ).toBe("descending");
    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    expect(routing.replace).toHaveBeenCalledWith("/launch?sort=price&dir=asc", {
      scroll: false,
    });
  });
});
