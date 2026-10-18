import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketPulse } from "../components/market-pulse";
import { fixtureBrand } from "../product/fixture-brand";
import { mockProjects } from "../data/mock";
import { marketRow, discoverRows } from "../data/market";
import { LocaleProvider } from "../i18n/locale";
import type { Activity } from "../domain/models";
afterEach(cleanup);
describe("market pulse shared state", () => {
  const rows = mockProjects
    .filter((p) => p.lifecycle === "CURVE_OPEN")
    .map(marketRow);
  it("limits recent events, filters other projects and keeps latest first", () => {
    const events: Activity[] = Array.from({ length: 9 }, (_, i) => ({
      id: `event-${i}`,
      type: "BUY",
      projectKey: rows[0].key,
      projectId: rows[0].projectId!,
      wallet: mockProjects[0].creatorWallet,
      timestamp: new Date(1700000000000 + i * 1000).toISOString(),
      displayValues: { amount: String(100 + i), paidAsset: "USDT" },
    }));
    events.push({
      ...events[0],
      id: "foreign",
      projectKey: marketRow(
        mockProjects.find((p) => p.lifecycle === "OPERATING")!,
      ).key,
      timestamp: "2099-01-01",
    });
    const view = render(
      <LocaleProvider initialLocale="en">
        <MarketPulse rows={rows} activities={events} launch />
      </LocaleProvider>,
    );
    const links = view.container.querySelectorAll(".tape-event");
    expect(links).toHaveLength(4);
    expect(links[0].textContent).toContain("108 USDT");
    expect(links[3].textContent).toContain("105 USDT");
    expect(links[0].getAttribute("href")).toBe(rows[0].href);
    expect(view.container.querySelectorAll(".market-focus-card")).toHaveLength(
      3,
    );
  });
  it("keeps unavailable prices and empty activity honest", () => {
    render(
      <LocaleProvider initialLocale="en">
        <MarketPulse
          rows={rows.map((r) => ({
            ...r,
            price: null,
            change: null,
            volume: null,
          }))}
          activities={[]}
          launch={false}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText("No activity yet")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });
  it("excludes future and stale activity from the live tape", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    const events: Activity[] = [-2 * 86400000, 60_000, -4000].map(
      (offset, i) => ({
        id: `timed-${i}`,
        type: "BUY",
        projectKey: rows[0].key,
        projectId: rows[0].projectId!,
        wallet: mockProjects[0].creatorWallet,
        timestamp: new Date(now + offset).toISOString(),
        displayValues: { amount: "100", paidAsset: "USDT" },
      }),
    );
    const view = render(
      <LocaleProvider initialLocale="en">
        <MarketPulse rows={rows} activities={events} now={now} launch />
      </LocaleProvider>,
    );
    expect(view.container.querySelectorAll(".tape-event")).toHaveLength(1);
    expect(
      view.container
        .querySelector(".tape-event")
        ?.getAttribute("data-event-id"),
    ).toBe("timed-2");
    expect(screen.getByText("just now")).toBeTruthy();
  });
  it("sorts volume from the same row values", () => {
    const sorted = discoverRows(rows, "launch", "all", [], "volume", "asc");
    expect(sorted.map((r) => r.volume)).toEqual(
      [...rows.map((r) => r.volume)].sort(
        (a, b) => (a ?? Infinity) - (b ?? Infinity),
      ),
    );
  });
});
describe("fixture branding identity boundaries", () => {
  const id = "56:0x" + (0x9a00).toString(16).padStart(40, "0");
  it("recognizes only canonical fixtures and preserves uploads and other chains", () => {
    expect(fixtureBrand(id, "L")).toBe(0);
    expect(fixtureBrand(id, "https://creator.example/logo.png")).toBeNull();
    expect(fixtureBrand(id.replace("56:", "1:"), "L")).toBeNull();
    expect(fixtureBrand("56:0x" + "a".repeat(40), "L")).toBeNull();
    expect(fixtureBrand(id, "custom")).toBeNull();
  });
});
