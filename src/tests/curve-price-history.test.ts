import { describe, expect, it } from "vitest";
import { curvePriceHistory } from "../product/curve-price-history";
import { mockProjects } from "../data/mock";
import { projectKey } from "../domain/identity";
import type { Activity } from "../domain/models";
describe("Curve trade time series", () => {
  it("uses only finite positive executed prices in the selected project/time range", () => {
    const p = mockProjects[0],
      now = Date.parse("2026-10-18T12:00:00Z");
    const event = (offset: number, price: string): Activity => ({
      id: String(offset),
      type: "BUY",
      projectKey: projectKey(p.chainId, p.tokenContract),
      projectId: p.projectId,
      wallet: p.creatorWallet,
      timestamp: new Date(now + offset).toISOString(),
      displayValues: { priceAfter: price },
    });
    const events = [
      event(-1000, "0.3"),
      event(-2000, "0.2"),
      event(-7200000, "0.1"),
      event(1000, "0.4"),
      event(-500, "NaN"),
      event(-400, "-1"),
      { ...event(-300, "0.7"), type: "CLAIM" as const },
      { ...event(-200, "0.8"), projectKey: projectKey(1, p.tokenContract) },
    ];
    expect(curvePriceHistory(p, events, now, 1).map((x) => x.price)).toEqual([
      0.2, 0.3,
    ]);
    expect(curvePriceHistory(p, events, now, 24).map((x) => x.price)).toEqual([
      0.1, 0.2, 0.3,
    ]);
    expect(curvePriceHistory(p, [], now, 24)).toEqual([]);
  });
});
