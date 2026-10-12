import type { Activity, Project } from "../domain/models";
import { projectKey } from "../domain/identity";
export type StakePoint = { time: number; amount: number; id: string };
export const stakeRanges = ["24H", "7D", "30D", "90D", "All"] as const;
export type StakeRange = (typeof stakeRanges)[number];
export function identitySeed(identity: string) {
  let hash = 2166136261;
  for (const c of identity.toLowerCase())
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
// Presentation history only. Successful persisted events reconstruct their exact
// deltas; the deterministic fixture baseline never changes economic state.
export function stakingHistory(
  project: Project,
  activities: Activity[],
): StakePoint[] {
  const key = projectKey(project.chainId, project.tokenContract);
  const events = activities
    .filter(
      (a) =>
        a.projectKey === key &&
        (a.type === "STAKE" || a.type === "UNSTAKE") &&
        a.displayValues.amount != null,
    )
    .sort(
      (a, b) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
        Number(a.id.split("-").at(-1)) - Number(b.id.split("-").at(-1)),
    );
  const current = project.operating?.totalStaked ?? 0;
  const delta = (a: Activity) =>
    Number(a.displayValues.amount) * (a.type === "UNSTAKE" ? -1 : 1);
  const baseline = Math.max(
    0,
    current - events.reduce((n, a) => n + delta(a), 0),
  );
  let end = events.length
    ? Date.parse(events[0].timestamp)
    : Date.parse(
        project.operating?.updatedAt ?? project.updatedAt ?? project.createdAt,
      );
  const seed = identitySeed(key);
  const began = Math.max(
    Date.parse(project.createdAt),
    Date.parse(project.migration.completedAt ?? project.createdAt),
  );
  end = Math.max(end, began);
  const duration = Math.min(90 * 86400000, Math.max(0, end - began));
  const points: StakePoint[] = Array.from({ length: 361 }, (_, i) => {
    const ratio = i / 360;
    const growth = 0.67 + 0.33 * ratio;
    const wave =
      Math.sin((i + (seed % 31)) / 12) * 0.016 * Math.sin(Math.PI * ratio);
    return {
      time: end - (1 - ratio) * duration,
      amount: duration ? baseline * (growth + wave) : baseline,
      id: `baseline-${i}`,
    };
  });
  let total = baseline;
  for (const event of events) {
    total += delta(event);
    points.push({
      time: Math.max(Date.parse(event.timestamp), points.at(-1)!.time),
      amount: Math.max(0, total),
      id: event.id,
    });
  }
  points[points.length - 1].amount = current;
  return points;
}
function fullWindow(points: StakePoint[], range: StakeRange) {
  const days = { "24H": 1, "7D": 7, "30D": 30, "90D": 90, All: Infinity }[
    range
  ];
  const cutoff = points.at(-1)!.time - days * 86400000;
  const first = points.findIndex((p) => p.time >= cutoff);
  if (first <= 0) return points;
  const before = points[first - 1],
    after = points[first];
  const ratio = (cutoff - before.time) / (after.time - before.time || 1);
  return [
    {
      time: cutoff,
      amount: before.amount + (after.amount - before.amount) * ratio,
      id: "range-start",
    },
    ...points.slice(first),
  ];
}

export function stakingWindow(points: StakePoint[], range: StakeRange) {
  const window = fullWindow(points, range);
  const limit = { "24H": 97, "7D": 225, "30D": 361, "90D": 721, All: 1000 }[
    range
  ];
  if (window.length <= limit) return window;
  const stride = Math.ceil(window.length / (limit - 1));
  return window.filter(
    (p, i) =>
      i === 0 ||
      i === window.length - 1 ||
      i % stride === 0 ||
      p.id.startsWith("state-") ||
      p.id.startsWith("SIM-"),
  );
}
