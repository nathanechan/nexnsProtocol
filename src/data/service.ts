import { marketDataAdapter } from "../simulation/live-market";
import { simulationStore } from "../simulation/store";
import { discoverProjects, type Sort, type Stage } from "./discovery";
import { createMockSearchService, type ProjectSearchService } from "./search";
import type { Activity, Project } from "../domain/models";
import { findProject } from "../domain/identity";
export interface NetworkSnapshot {
  total: number;
  curveCount: number;
  operatingCount: number;
  participants: number | null;
  volume24h: number | null;
  tvl: number | null;
  liquidity: number | null;
  curveLeaders: Project[];
  operatingLeaders: Project[];
  recentCreated: Project[];
  recentMigrated: Project[];
  activities: Activity[];
  updatedAt: string;
}
export interface EconomyDataService extends ProjectSearchService {
  discovery(stage: Stage, sort: Sort): Promise<Project[]>;
  network(): Promise<NetworkSnapshot>;
  project(chain: string, contract: string): Promise<Project | undefined>;
  projectActivities(key: string): Promise<Activity[]>;
}
export function buildNetworkSnapshot(
  projects: Project[],
  activities: Activity[],
): NetworkSnapshot {
  const curve = projects.filter((p) => p.lifecycle === "CURVE_OPEN");
  const operating = projects.filter((p) => p.lifecycle === "OPERATING");
  const complete = operating.every((p) => p.operating !== null);
  const totalMetric = (key: "tvl" | "liquidity") =>
    operating.some((p) => p.operating?.[key] == null)
      ? null
      : operating.reduce((sum, p) => sum + p.operating![key], 0);
  return {
    total: projects.length,
    curveCount: curve.length,
    operatingCount: operating.length,
    // Participation counts are project-level memberships, not deduplicated wallets.
    participants: complete
      ? projects.reduce(
          (sum, p) =>
            sum +
            (p.lifecycle === "OPERATING"
              ? (p.operating?.activeParticipants ?? 0)
              : p.curve.participants),
          0,
        )
      : null,
    volume24h: complete
      ? projects.reduce(
          (sum, p) =>
            sum +
            (p.lifecycle === "CURVE_OPEN"
              ? p.curve.volume24h
              : p.lifecycle === "OPERATING"
                ? (p.operating?.volume24h ?? 0)
                : 0),
          0,
        )
      : null,
    tvl: totalMetric("tvl"),
    liquidity: totalMetric("liquidity"),
    curveLeaders: discoverProjects(projects, "curve").slice(0, 5),
    operatingLeaders: discoverProjects(projects, "operating").slice(0, 5),
    recentCreated: [...curve]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5),
    recentMigrated: [...operating]
      .filter((p) => p.migration.completedAt !== null)
      .sort(
        (a, b) =>
          Date.parse(b.migration.completedAt ?? "") -
          Date.parse(a.migration.completedAt ?? ""),
      )
      .slice(0, 5),
    activities: [...activities]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 8),
    updatedAt: "2026-10-11T08:00:00Z",
  };
}
export function createEconomyDataService(
  projects: Project[],
  activities: Activity[] = [],
): EconomyDataService {
  const search = createMockSearchService(projects);
  return {
    ...search,
    discovery: async (stage, sort) => discoverProjects(projects, stage, sort),
    network: async () => buildNetworkSnapshot(projects, activities),
    project: async (chain, contract) => findProject(projects, chain, contract),
    projectActivities: async (key) =>
      activities.filter((a) => a.projectKey === key),
  };
}
const liveService = () => {
  const s = marketDataAdapter(simulationStore.getState());
  return createEconomyDataService(Object.values(s.projects), s.activities);
};
export const economyService: EconomyDataService = {
  search: (query, chainId) => liveService().search(query, chainId),
  discovery: (stage, sort) => liveService().discovery(stage, sort),
  network: () => liveService().network(),
  project: (chain, contract) => liveService().project(chain, contract),
  projectActivities: (key) => liveService().projectActivities(key),
};
