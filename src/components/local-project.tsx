"use client";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import type { ProjectKey } from "../domain/models";
import { ProjectShell } from "./project-shell";
import { EmptyState, Skeleton } from "./ui";
export function LocalProject({
  projectIdentity,
}: {
  projectIdentity: ProjectKey;
}) {
  const { t } = useLocale();

  const hydrated = useSimulation((s) => s.hydrated);
  const project = useSimulation((s) => s.projects[projectIdentity]);
  if (!hydrated) return <Skeleton />;
  return project ? (
    <ProjectShell initialProject={project} />
  ) : (
    <EmptyState
      title={t("未找到项目")}
      description={t("项目暂不可用，请检查合约地址。")}
    />
  );
}
