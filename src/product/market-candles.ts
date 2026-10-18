import type { Activity, Project } from "../domain/models";
import type { LiveState } from "../simulation/live-market";
import { referencePrice } from "../simulation/live-market";
import { curvePriceHistory } from "./curve-price-history";
export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
export function aggregateCandles(
  samples: { time: number; price: number }[],
  interval: number,
): MarketCandle[] {
  const buckets = new Map<number, MarketCandle>();
  for (const p of [...samples].sort((a, b) => a.time - b.time)) {
    if (!Number.isFinite(p.time) || !Number.isFinite(p.price) || p.price <= 0)
      continue;
    const time = Math.floor(p.time / 1000 / interval) * interval,
      bar = buckets.get(time);
    if (bar) {
      bar.high = Math.max(bar.high, p.price);
      bar.low = Math.min(bar.low, p.price);
      bar.close = p.price;
    } else
      buckets.set(time, {
        time,
        open: p.price,
        high: p.price,
        low: p.price,
        close: p.price,
      });
  }
  return [...buckets.values()];
}
export function marketCandles(
  project: Project,
  activities: Activity[],
  live: LiveState | null,
  interval: number,
) {
  const now = live?.now ?? Date.now();
  if (project.lifecycle !== "OPERATING")
    return aggregateCandles(
      curvePriceHistory(project, activities, now, 24),
      interval,
    );
  const key = `${project.chainId}:${project.tokenContract.toLowerCase()}`,
    source = live?.projects[key];
  if (!source) return [];
  const start = Math.max(Date.parse(source.operatingStart), now - 6 * 3600000);
  const samples = [];
  for (let t = start; t < now; t += 10000) {
    const price = referencePrice(source, key, t);
    if (price != null) samples.push({ time: t, price });
  }
  const price = referencePrice(source, key, now);
  if (price != null) samples.push({ time: now, price });
  return aggregateCandles(samples, interval);
}
