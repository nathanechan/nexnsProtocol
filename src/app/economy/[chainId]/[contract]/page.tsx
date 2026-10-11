import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { economyService } from "../../../../data/service";
import { projectKey } from "../../../../domain/identity";
import { ProjectShell } from "../../../../components/project-shell";
import { LocalProject } from "../../../../components/local-project";
export default async function Page({
  params,
}: {
  params: Promise<{ chainId: string; contract: string }>;
}) {
  const { chainId, contract } = await params;
  let key;
  try {
    if (!/^[1-9]\d*$/.test(chainId)) notFound();
    key = projectKey(Number(chainId), contract);
  } catch {
    notFound();
  }
  const project = await economyService.project(chainId, contract);
  if (project) return <ProjectShell initialProject={project} />;
  let registered = false;
  try {
    registered = JSON.parse(
      (await cookies()).get("nexus-demo-projects")?.value ?? "[]",
    ).includes(key);
  } catch {}
  if (!registered) notFound();
  return <LocalProject projectIdentity={key} />;
}
