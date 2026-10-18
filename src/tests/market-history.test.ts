import { describe, expect, it } from "vitest";
import { marketHistory } from "../product/market-history";
import { mockProjects } from "../data/mock";
import type { Activity } from "../domain/models";
import { projectKey } from "../domain/identity";
describe("market price history", () => {
  const project = mockProjects.find((p) => p.lifecycle === "CURVE_OPEN")!;
  const event = (
    fields: Record<string, string>,
    timestamp = new Date().toISOString(),
  ): Activity => ({
    id: "quote",
    projectKey: projectKey(project.chainId, project.tokenContract),
    projectId: project.projectId,
    wallet: project.creatorWallet,
    type: "BUY",
    timestamp,
    displayValues: { summary: "Buy", ...fields },
  });
  it("does not invent history for legacy activity", () => {
    expect(marketHistory(project, [event({ amount: "100" })])).toEqual([]);
  });
  it("uses recorded quote prices and excludes stale or invalid snapshots", () => {
    expect(
      marketHistory(project, [
        event({ priceBefore: ".1", priceAfter: ".12" }),
        event({ priceBefore: "1", priceAfter: "Infinity" }),
        event(
          { priceBefore: ".01", priceAfter: ".02" },
          "2020-01-01T00:00:00Z",
        ),
      ]),
    ).toEqual([0.1, 0.12]);
  });
});
