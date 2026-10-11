import type { Project } from "../domain/models";
export type SearchMatch =
  "CONTRACT" | "PROJECT_ID" | "SYMBOL" | "NAME" | "CREATOR";
export interface SearchResult {
  project: Project;
  match: SearchMatch;
}
export interface ProjectSearchService {
  search(query: string, chainId?: number): Promise<SearchResult[]>;
}
export function searchProjects(
  projects: Project[],
  query: string,
  chainId?: number,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return projects
    .filter((p) => chainId === undefined || p.chainId === chainId)
    .flatMap((p) => {
      const match: SearchMatch | undefined =
        p.tokenContract.toLowerCase() === q
          ? "CONTRACT"
          : p.projectId.toLowerCase() === q ||
              p.projectId.toLowerCase().replace(/^nx-demo-/, "nx-") === q
            ? "PROJECT_ID"
            : p.symbol.toLowerCase() === q
              ? "SYMBOL"
              : p.name.toLowerCase().includes(q)
                ? "NAME"
                : p.creatorWallet.toLowerCase() === q
                  ? "CREATOR"
                  : undefined;
      return match ? [{ project: p, match }] : [];
    })
    .sort(
      (a, b) =>
        ["CONTRACT", "PROJECT_ID", "SYMBOL", "NAME", "CREATOR"].indexOf(
          a.match,
        ) -
          ["CONTRACT", "PROJECT_ID", "SYMBOL", "NAME", "CREATOR"].indexOf(
            b.match,
          ) || a.project.projectId.localeCompare(b.project.projectId),
    );
}
export const createMockSearchService = (
  projects: Project[],
): ProjectSearchService => ({
  search: async (query, chainId) => searchProjects(projects, query, chainId),
});
