import type { Activity, Project } from "../domain/models";
import { projectKey } from "../domain/identity";

export function curvePriceHistory(
  project: Project,
  activities: Activity[],
  now: number,
  hours: number,
) {
  return activities
    .filter(
      (a) =>
        a.projectKey === projectKey(project.chainId, project.tokenContract) &&
        (a.type === "BUY" || a.type === "SELL") &&
        Date.parse(a.timestamp) >= now - hours * 3600000 &&
        Date.parse(a.timestamp) <= now &&
        Number(a.displayValues.priceAfter) > 0 &&
        Number.isFinite(Number(a.displayValues.priceAfter)),
    )
    .map((a) => ({
      time: Date.parse(a.timestamp),
      price: Number(a.displayValues.priceAfter),
    }))
    .sort((a, b) => a.time - b.time);
}
