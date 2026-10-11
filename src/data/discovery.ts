import type { Project } from "../domain/models";
import { projectKey } from "../domain/identity";
export type Stage = "curve" | "operating";
export const curveSorts = {
  progress: "曲线进度",
  volume: "24H 成交量",
  participants: "参与人数",
  newest: "创建时间",
} as const;
export const operatingSorts = {
  tvl: "资金规模",
  volume: "24H 成交量",
  participants: "活跃参与人数",
  liquidity: "流动性",
  marketCap: "市值",
} as const;
export type Sort = keyof typeof curveSorts | keyof typeof operatingSorts;
export function parseExploreState(params: Pick<URLSearchParams, "get">): {
  stage: Stage;
  sort: Sort;
  query: string;
} {
  const stage = params.get("stage") === "operating" ? "operating" : "curve";
  const candidate = params.get("sort");
  const options = stage === "curve" ? curveSorts : operatingSorts;
  return {
    stage,
    sort:
      candidate && Object.hasOwn(options, candidate)
        ? (candidate as Sort)
        : stage === "curve"
          ? "progress"
          : "tvl",
    query: params.get("q") ?? "",
  };
}
function descending(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  const av = a != null && Number.isFinite(a);
  const bv = b != null && Number.isFinite(b);
  return av && bv ? b! - a! : av ? -1 : bv ? 1 : 0;
}
function metric(
  p: Project,
  stage: Stage,
  sort: Sort,
): number | null | undefined {
  if (stage === "curve") {
    return sort === "progress"
      ? p.curve.progress
      : sort === "volume"
        ? p.curve.volume24h
        : sort === "participants"
          ? p.curve.participants
          : Date.parse(p.createdAt);
  }
  return sort === "tvl"
    ? p.operating?.tvl
    : sort === "volume"
      ? p.operating?.volume24h
      : sort === "participants"
        ? p.operating?.activeParticipants
        : sort === "liquidity"
          ? p.operating?.liquidity
          : p.operating?.marketCap;
}
export function discoverProjects(
  projects: Project[],
  stage: Stage,
  sort: Sort = stage === "curve" ? "progress" : "tvl",
): Project[] {
  return projects
    .filter(
      (p) => p.lifecycle === (stage === "curve" ? "CURVE_OPEN" : "OPERATING"),
    )
    .sort(
      (a, b) =>
        Number(Boolean(b.isPlatformToken)) -
          Number(Boolean(a.isPlatformToken)) ||
        descending(metric(a, stage, sort), metric(b, stage, sort)) ||
        (stage === "curve"
          ? descending(a.curve.volume24h, b.curve.volume24h)
          : descending(
              a.operating?.activeParticipants,
              b.operating?.activeParticipants,
            )) ||
        descending(Date.parse(a.createdAt), Date.parse(b.createdAt)) ||
        projectKey(a.chainId, a.tokenContract).localeCompare(
          projectKey(b.chainId, b.tokenContract),
        ),
    )
    .slice(0, 100);
}
