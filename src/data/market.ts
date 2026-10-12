import { marketDataAdapter, stakedValue } from "../simulation/live-market";
import type { Project, ProjectKey } from "../domain/models";
import { projectKey, projectRoute } from "../domain/identity";
import { type Sort } from "./discovery";
import { simulationStore } from "../simulation/store";
export type MarketSection = "markets" | "launch" | "live";
export type MarketSort =
  Sort | "change" | "stage" | "price" | "staked" | "value" | "users";
export const marketSorts: Record<MarketSection, readonly MarketSort[]> = {
  markets: ["volume", "change", "stage", "newest"],
  launch: ["progress", "price", "volume", "participants", "newest"],
  live: ["price", "staked", "users"],
};
export const defaultMarketSort = (section: MarketSection): MarketSort =>
  section === "markets"
    ? "volume"
    : section === "launch"
      ? "progress"
      : "staked";
export interface MarketRow {
  key: ProjectKey;
  href: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  symbol: string;
  logo: string;
  contract: string;
  platform: boolean;
  stage: "CURVE_OPEN" | "OPERATING";
  price: number | null;
  change: number | null;
  progress: number | null;
  remaining: number | null;
  totalStaked?: number | null;
  value: number | null;
  tvl: number | null;
  volume: number | null;
  participants: number | null;
  liquidity: number | null;
  createdAt: string;
}
export function marketRow(project: Project): MarketRow {
  const curve = project.lifecycle === "CURVE_OPEN";
  return {
    key: projectKey(project.chainId, project.tokenContract),
    href: projectRoute(project),
    name: project.name,
    nameZh: project.nameZh,
    nameEn: project.nameEn,
    symbol: project.symbol,
    logo: project.logo,
    contract: project.tokenContract,
    platform: Boolean(project.isPlatformToken),
    stage: curve ? "CURVE_OPEN" : "OPERATING",
    price: curve
      ? project.curve.curvePrice
      : (project.operating?.tokenPrice ?? null),
    change: curve ? null : (project.operating?.change24h ?? null),
    progress: curve ? project.curve.progress : null,
    remaining: curve
      ? Math.max(0, project.curve.targetReserve - project.curve.netReserve)
      : null,
    totalStaked: curve ? null : (project.operating?.totalStaked ?? null),
    value: curve
      ? null
      : stakedValue(
          project.operating?.totalStaked ?? 0,
          project.operating?.tokenPrice ?? null,
        ),
    tvl: curve ? null : (project.operating?.tvl ?? null),
    volume: curve
      ? project.curve.volume24h
      : (project.operating?.volume24h ?? null),
    participants: curve
      ? project.curve.participants
      : (project.operating?.activeParticipants ?? null),
    liquidity: curve ? null : (project.operating?.liquidity ?? null),
    createdAt: project.createdAt,
  };
}
const descending = (a: number | null, b: number | null) =>
  a == null ? (b == null ? 0 : 1) : b == null ? -1 : b - a;
export function marketRows(
  projects: Project[],
  section: MarketSection,
  requested: string,
): MarketRow[] {
  const sort = marketSorts[section].includes(requested as MarketSort)
    ? (requested as MarketSort)
    : defaultMarketSort(section);
  if (section !== "markets") {
    const rows = projects
      .filter(
        (p) =>
          p.lifecycle === (section === "launch" ? "CURVE_OPEN" : "OPERATING"),
      )
      .map(marketRow);
    const metric = (r: MarketRow) =>
      sort === "staked"
        ? section === "live"
          ? r.value
          : (r.totalStaked ?? null)
        : sort === "value"
          ? r.value
          : sort === "users" || sort === "participants"
            ? r.participants
            : sort === "price"
              ? r.price
              : sort === "progress"
                ? r.progress
                : sort === "volume"
                  ? r.volume
                  : sort === "liquidity"
                    ? r.liquidity
                    : Date.parse(r.createdAt);
    return rows
      .sort(
        (a, b) =>
          Number(b.platform) - Number(a.platform) ||
          descending(metric(a), metric(b)) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, 100);
  }
  const metric = (p: Project) =>
    sort === "volume"
      ? p.lifecycle === "CURVE_OPEN"
        ? p.curve.volume24h
        : (p.operating?.volume24h ?? null)
      : sort === "change"
        ? p.lifecycle === "CURVE_OPEN"
          ? null
          : (p.operating?.change24h ?? null)
        : sort === "stage"
          ? p.lifecycle === "CURVE_OPEN"
            ? 1
            : 0
          : Date.parse(p.createdAt);
  return projects
    .filter((p) => p.lifecycle === "CURVE_OPEN" || p.lifecycle === "OPERATING")
    .sort(
      (a, b) =>
        Number(Boolean(b.isPlatformToken)) -
          Number(Boolean(a.isPlatformToken)) ||
        descending(metric(a), metric(b)) ||
        projectKey(a.chainId, a.tokenContract).localeCompare(
          projectKey(b.chainId, b.tokenContract),
        ),
    )
    .map(marketRow);
}
export interface MarketDataService {
  list(section: MarketSection, sort: MarketSort): Promise<MarketRow[]>;
}
export const createMarketDataService = (
  projects: Project[],
): MarketDataService => ({
  list: async (section, sort) => marketRows(projects, section, sort),
});
// Replace this adapter with backend market rows; components do not read financial books.
export const marketService: MarketDataService = {
  list: async (section, sort) =>
    marketRows(
      Object.values(marketDataAdapter(simulationStore.getState()).projects),
      section,
      sort,
    ),
};
