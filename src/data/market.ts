import type { Project, ProjectKey } from "../domain/models";
import { projectKey, projectRoute } from "../domain/identity";
import { discoverProjects, type Sort } from "./discovery";
import { simulationStore } from "../simulation/store";
export type MarketSection = "markets" | "launch" | "live";
export type MarketSort = Sort | "change" | "stage";
export const marketSorts: Record<MarketSection, readonly MarketSort[]> = {
  markets: ["volume", "change", "stage", "newest"],
  launch: ["progress", "volume", "participants", "newest"],
  live: ["tvl", "volume", "liquidity", "participants", "marketCap"],
};
export const defaultMarketSort = (section: MarketSection): MarketSort =>
  section === "markets" ? "volume" : section === "launch" ? "progress" : "tvl";
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
  if (section !== "markets")
    return discoverProjects(
      projects,
      section === "launch" ? "curve" : "operating",
      sort as Sort,
    ).map(marketRow);
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
      Object.values(simulationStore.getState().projects),
      section,
      sort,
    ),
};
