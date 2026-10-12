import type { Project } from "../domain/models";
type Metadata = Pick<Project, "name" | "nameZh" | "nameEn">;
export const projectName = (project: Metadata, locale: "zh-CN" | "en") =>
  (locale === "zh-CN" ? project.nameZh : project.nameEn)?.trim() ||
  project.name;
export const projectDescription = (
  project: Pick<Project, "description" | "descriptionZh" | "descriptionEn">,
  locale: "zh-CN" | "en",
) =>
  (locale === "zh-CN"
    ? project.descriptionZh
    : project.descriptionEn
  )?.trim() || project.description;
export const localizedProject = (
  project: Project,
  locale: "zh-CN" | "en",
): Project => ({
  ...project,
  name: projectName(project, locale),
  description: projectDescription(project, locale),
});
