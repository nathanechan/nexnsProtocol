"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import type { Project } from "../domain/models";
import { projectRoute } from "../domain/identity";
import { ContractAddress, LifecycleBadge } from "./ui";
import { ProjectLogo } from "./project-logo";
export function ProjectIdentity({ project }: { project: Project }) {
  const { t } = useLocale();

  return (
    <div className="project-identity">
      <div className="project-logo" aria-hidden>
        <ProjectLogo
          logo={project.logo}
          identity={`${project.chainId}:${project.tokenContract}`}
          platform={project.isPlatformToken}
        />
      </div>
      <div className="identity-body">
        <Link className="project-link" href={projectRoute(project)}>
          {project.symbol}{" "}
          {project.name !== project.symbol && <span>{project.name}</span>}
        </Link>
        <div className="identity-meta">
          <span>
            {t(project.chainId === 56 ? "BSC" : `Chain ${project.chainId}`)}
          </span>
          <ContractAddress address={project.tokenContract} />
        </div>
      </div>
      <LifecycleBadge state={project.lifecycle} />
    </div>
  );
}
