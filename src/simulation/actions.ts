import type { Project, ProjectKey, Lifecycle } from "../domain/models";
// Future execution contract only. No action implementation or invented economic behavior.
export interface SimulationActions {
  createProject(
    input: Pick<Project, "name" | "symbol" | "description" | "logo">,
  ): Promise<ProjectKey>;
  curveBuy(project: ProjectKey, amount: string): Promise<void>;
  curveSell(project: ProjectKey, amount: string): Promise<void>;
  advanceLifecycle(project: ProjectKey, lifecycle: Lifecycle): Promise<void>;
  createPosition(
    project: ProjectKey,
    amount: string,
    referral: string,
  ): Promise<void>;
  stake(project: ProjectKey, amount: string): Promise<void>;
  unstake(project: ProjectKey, amount: string): Promise<void>;
  settleDay(project: ProjectKey): Promise<void>;
  claim(project: ProjectKey, amount: string): Promise<void>;
}
