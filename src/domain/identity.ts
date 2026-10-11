import type { Address, Project, ProjectKey } from "./models";
export function normalizeAddress(value: string): Address {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value))
    throw new Error("Invalid contract address");
  return value.toLowerCase() as Address;
}
export function projectKey(chainId: number, contract: string): ProjectKey {
  if (!Number.isSafeInteger(chainId) || chainId <= 0)
    throw new Error("Invalid chain");
  return `${chainId}:${normalizeAddress(contract)}`;
}
export function shortAddress(value: string): string {
  const address = normalizeAddress(value);
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
export function projectRoute(
  project: Pick<Project, "chainId" | "tokenContract">,
): string {
  projectKey(project.chainId, project.tokenContract);
  return `/economy/${project.chainId}/${normalizeAddress(project.tokenContract)}`;
}
export function findProject(
  projects: Project[],
  chain: string,
  contract: string,
): Project | undefined {
  try {
    if (!/^[1-9]\d*$/.test(chain)) return undefined;
    const key = projectKey(Number(chain), contract);
    return projects.find((p) => projectKey(p.chainId, p.tokenContract) === key);
  } catch {
    return undefined;
  }
}
