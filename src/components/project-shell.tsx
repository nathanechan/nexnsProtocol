"use client";
import type { Project, Activity } from "../domain/models";
import { useSimulation } from "../simulation/store";
import { projectKey } from "../domain/identity";
import { useLocale } from "../i18n/locale";
import { localizedProject } from "../product/metadata";
import { TokenTerminal } from "./token-terminal";
export function ProjectShell({
  initialProject,
  initialActivities = [],
}: {
  initialProject: Project;
  initialActivities?: Activity[];
}) {
  const { locale } = useLocale();
  const raw = useSimulation(
    (s) =>
      s.projects[
        projectKey(initialProject.chainId, initialProject.tokenContract)
      ] ?? initialProject,
  );
  return (
    <TokenTerminal
      key={projectKey(raw.chainId, raw.tokenContract)}
      project={localizedProject(raw, locale)}
      initialActivities={initialActivities}
    />
  );
}
