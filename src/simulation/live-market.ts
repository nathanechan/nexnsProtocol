import type { Activity, Project, ProjectKey } from "../domain/models";
import {
  identitySeed,
  stakingHistory,
  type StakePoint,
} from "../product/staking-history";
import type { SimulationData } from "./store";
export const LIVE_CADENCE = 30_000;
export type LiveProject = {
  operatingStart: string;
  epoch: number;
  basePrice: number | null;
  baseStake: number;
  canonicalStake: number;
  canonicalUsers: number;
  signature: string;
  history: StakePoint[];
};
export type LiveState = { now: number; projects: Record<string, LiveProject> };
const day = 86_400_000;
const safe = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
export function referencePrice(source: LiveProject, key: string, time: number) {
  if (source.basePrice == null) return null;
  const seed = identitySeed(key),
    hours =
      (Math.max(time, Date.parse(source.operatingStart)) - source.epoch) /
      3_600_000;
  const amplitude = [0.012, 0.006, 0.022, 0.009][seed % 4];
  return safe(
    source.basePrice *
      (1 +
        amplitude * Math.sin(hours / (5 + (seed % 9))) +
        amplitude * 0.25 * Math.sin(hours / 2.5)),
  );
}
export function backgroundStake(
  source: LiveProject,
  key: string,
  time: number,
) {
  const hours = Math.max(0, time - source.epoch) / 3_600_000;
  const profile = identitySeed(key) % 4;
  const drift =
    [0.02, 0.002, 0.007, -0.012][profile] * (1 - Math.exp(-hours / 96));
  return source.baseStake * drift;
}
export const stakedValue = (staked: number, price: number | null) =>
  price == null || !Number.isFinite(price)
    ? null
    : safe(safe(staked) * safe(price));
export function reconcileLive(
  s: Pick<
    SimulationData,
    "projects" | "activities" | "liveMarket" | "operatingBooks"
  >,
  timestamp: number,
): LiveState {
  const now = Math.max(
    s.liveMarket?.now ?? 0,
    Math.floor(timestamp / LIVE_CADENCE) * LIVE_CADENCE,
  );
  const projects: LiveState["projects"] = {};
  for (const [key, p] of Object.entries(s.projects)) {
    if (p.lifecycle !== "OPERATING" || !p.operating) continue;
    const op = p.operating;
    const signature = `${op.totalStaked}:${op.activeParticipants}:${p.migration.completedAt}:${s.activities.find((a) => a.projectKey === key && (a.type === "STAKE" || a.type === "UNSTAKE"))?.id ?? ""}`;
    const prior = s.liveMarket?.projects[key];
    const operatingStart = p.migration.completedAt ?? p.createdAt;
    if (!prior || prior.operatingStart !== operatingStart) {
      const points = stakingHistory(p, s.activities);
      points.push({
        time: Math.max(now, points.at(-1)!.time),
        amount: safe(op.totalStaked),
        id: "live-start",
      });
      projects[key] = {
        operatingStart,
        epoch: now,
        basePrice: op.tokenPrice,
        baseStake: safe(
          Number(s.operatingBooks[key as ProjectKey]?.base.staked ?? "0") /
            1e18,
        ),
        canonicalStake: safe(op.totalStaked),
        canonicalUsers: safe(op.activeParticipants),
        signature,
        history: points,
      };
      continue;
    }
    let history = prior.history;
    if (signature !== prior.signature || now > (s.liveMarket?.now ?? now)) {
      history = [...history];
      // Catch up in bounded work. Existing history is immutable, including user events.
      const head = history.at(-1)!;
      const last = head.time;
      // The open fifteen-minute sample follows the live total. Closed samples
      // and financial user events are immutable; only this live head is replaced.
      if (
        head.id.startsWith("clock-") &&
        Math.floor(head.time / 900_000) === Math.floor(now / 900_000)
      )
        history.pop();
      const start = Math.max(last, s.liveMarket?.now ?? last);
      if (now > start) {
        const count = Math.min(
          64,
          Math.max(1, Math.ceil((now - start) / 900_000)),
        );
        for (let i = 1; i <= count; i++) {
          const time = start + ((now - start) * i) / count;
          history.push({
            time,
            amount: safe(
              prior.canonicalStake + backgroundStake(prior, key, time),
            ),
            id: `clock-${time}`,
          });
        }
      }
      const amount = safe(op.totalStaked + backgroundStake(prior, key, now));
      if (signature !== prior.signature)
        history.push({
          time: Math.max(now, history.at(-1)!.time),
          amount,
          id: `state-${signature}`,
        });
      // Retain all points for ninety days, compact older history without changing its shape.
      if (history.length > 2000) {
        let bucket = -1;
        history = history.filter((point, i) => {
          const next = Math.floor(point.time / 21_600_000);
          const retain =
            i === 0 ||
            i === history.length - 1 ||
            point.id.startsWith("state-") ||
            point.id.startsWith("SIM-") ||
            point.time >= now - 7 * day ||
            next !== bucket;
          bucket = next;
          return retain;
        });
        if (history.length > 4000)
          history = history.filter(
            (_, i) => i % 2 === 0 || i === history.length - 1,
          );
      }
    }
    projects[key] = {
      ...prior,
      basePrice: prior.basePrice ?? op.tokenPrice,
      canonicalStake: safe(op.totalStaked),
      canonicalUsers: safe(op.activeParticipants),
      signature,
      history,
    };
  }
  return { now, projects };
}
export function projectLive(p: Project, live: LiveState | null): Project {
  const key = `${p.chainId}:${p.tokenContract.toLowerCase()}`;
  const source = live?.projects[key];
  if (!source || p.lifecycle !== "OPERATING" || !p.operating || !live) return p;
  const available = p.priceStatus === "VALID" || p.priceStatus === "PROTECTED";
  const price = available ? referencePrice(source, key, live.now) : null;
  const previous = referencePrice(
    source,
    key,
    Math.max(Date.parse(source.operatingStart), live.now - day),
  );
  return {
    ...p,
    operating: {
      ...p.operating,
      tokenPrice: price,
      totalStaked: safe(
        p.operating.totalStaked + backgroundStake(source, key, live.now),
      ),
      activeParticipants:
        p.operating.activeParticipants +
        Math.floor(
          Math.max(0, live.now - source.epoch) /
            ((3 + (identitySeed(key) % 4)) * 3_600_000),
        ),
      change24h: price != null && previous ? price / previous - 1 : null,
    },
  };
}
export function ecosystemActivity(p: Project, live: LiveState): Activity[] {
  const key = `${p.chainId}:${p.tokenContract.toLowerCase()}` as ProjectKey;
  const source = live.projects[key];
  if (!source) return [];
  const interval = (3 + (identitySeed(key) % 4)) * 3_600_000;
  const count = Math.floor(Math.max(0, live.now - source.epoch) / interval);
  return Array.from({ length: Math.min(count, 3) }, (_, index) => {
    const event = count - index;
    const seed = identitySeed(`${key}:${event}`);
    const wallet =
      `0x${seed.toString(16).padStart(8, "0").repeat(5)}` as Activity["wallet"];
    return {
      id: `background-${key}-${event}`,
      projectKey: key,
      projectId: p.projectId,
      type: "PARTICIPATE",
      wallet,
      timestamp: new Date(source.epoch + event * interval).toISOString(),
      displayValues: { summary: `参与 ${100 + (seed % 900)} USDT` },
    };
  });
}
const cache = new WeakMap<object, SimulationData>();
const activityCache = new WeakMap<
  Activity[],
  { signature: string; result: Activity[] }
>();
// UI source adapter: financial books/balances remain unchanged. Future market APIs
// replace this projection; presentation ticks never settle or mint user rewards.
export function marketDataAdapter<T extends SimulationData>(s: T): T {
  if (!s.liveMarket) return s;
  const cached = cache.get(s);
  if (cached) return cached as T;
  const projects = Object.fromEntries(
    Object.entries(s.projects).map(([key, p]) => [
      key,
      projectLive(p, s.liveMarket),
    ]),
  ) as T["projects"];
  const background = Object.values(s.projects).flatMap((p) =>
    ecosystemActivity(p, s.liveMarket!),
  );
  const signature = background.map((event) => event.id).join("|");
  const priorActivities = activityCache.get(s.activities);
  const activities =
    background.length === 0
      ? s.activities
      : priorActivities?.signature === signature
        ? priorActivities.result
        : [...s.activities, ...background];
  if (background.length)
    activityCache.set(s.activities, { signature, result: activities });
  const result = { ...s, projects, activities };
  cache.set(s, result);
  return result;
}
export function liveStakeHistory(
  p: Project,
  activities: Activity[],
  live: LiveState | null,
) {
  return (
    live?.projects[`${p.chainId}:${p.tokenContract.toLowerCase()}`]?.history ??
    stakingHistory(p, activities)
  );
}

export function referenceHistory(
  source: LiveProject,
  key: string,
  now: number,
) {
  const start = Math.max(Date.parse(source.operatingStart), now - 86400000);
  return Array.from({ length: 49 }, (_, i) => {
    const time = start + ((now - start) * i) / 48;
    return { time, price: referencePrice(source, key, time) };
  });
}
