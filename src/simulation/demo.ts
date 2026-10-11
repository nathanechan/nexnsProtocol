import type { ProjectKey } from "../domain/models";
import type { SimulationState } from "./store";
export const demoPresets = [
  { id: "fresh", label: "01 · 全新发行" },
  { id: "seventyFive", label: "02 · 曲线 75%" },
  { id: "near", label: "03 · 即将毕业" },
  { id: "migration", label: "04 · 迁移准备" },
  { id: "newUser", label: "05 · 运行新用户" },
  { id: "activeUser", label: "06 · 运行活跃用户" },
  { id: "rewardReady", label: "07 · 奖励就绪" },
  { id: "completed", label: "08 · 已完成头寸" },
] as const;
export type DemoPreset = (typeof demoPresets)[number]["id"];
export function applyDemoPreset(
  s: SimulationState,
  key: ProjectKey,
  preset: DemoPreset,
): ProjectKey {
  if (preset === "fresh")
    return s.createProject({
      name: "新项目",
      symbol: "NEW",
      description: "连接参与者与长期价值的链上项目。",
      logo: "N",
      links: [],
    });
  if (preset === "seventyFive" || preset === "near") {
    s.seedScenario(key, preset);
    return key;
  }
  if (preset === "migration") {
    s.seedScenario(key, "ready");
    return key;
  }
  s.seedScenario(key, "operating");
  if (preset === "activeUser") s.seedOperating(key, "contribution");
  if (preset === "rewardReady") s.seedOperating(key, "claimable");
  if (preset === "completed") {
    s.seedOperating(key, "nearCapacity");
    s.settleDay(key);
  }
  return key;
}
