import type { Activity, Project } from "../domain/models";
import type { LiveState } from "../simulation/live-market";
import { referencePrice } from "../simulation/live-market";
export function marketHistory(
  project: Project,
  activities: Activity[],
  live?: LiveState | null,
) {
  const key = `${project.chainId}:${project.tokenContract.toLowerCase()}`;
  const source = live?.projects[key];
  if (project.lifecycle === "OPERATING" && source && live) {
    const start = Math.max(
      Date.parse(source.operatingStart),
      live.now - 86400000,
    );
    if (start >= live.now || source.basePrice == null) return [];
    return Array.from({ length: 25 }, (_, i) =>
      referencePrice(source, key, start + ((live.now - start) * i) / 24),
    ).filter((v): v is number => v != null && Number.isFinite(v));
  }
  const cutoff = (live?.now ?? Date.now()) - 86400000;
  const events = activities
    .filter(
      (a) =>
        a.projectKey === key &&
        (a.type === "BUY" || a.type === "SELL") &&
        Date.parse(a.timestamp) >= cutoff,
    )
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const samples = events.flatMap((a) => {
    const before = Number(a.displayValues.priceBefore),
      after = Number(a.displayValues.priceAfter);
    return before > 0 &&
      after > 0 &&
      Number.isFinite(before) &&
      Number.isFinite(after)
      ? [before, after]
      : [];
  });
  return samples;
}
