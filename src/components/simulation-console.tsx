"use client";
import { OperatingDemo } from "./operating-demo";
import { applyDemoPreset, demoPresets } from "../simulation/demo";
import { useState } from "react";
import Link from "next/link";
import {
  simulationStore,
  useSimulation,
  type Scenario,
} from "../simulation/store";
import { projectRoute } from "../domain/identity";
import type { ProjectKey } from "../domain/models";
import {
  Button,
  DetailCard,
  PageHeader,
  Select,
  LifecycleBadge,
  Modal,
} from "./ui";
export function SimulationConsole() {
  const projects = useSimulation((s) => s.projects);
  const [selected, setSelected] = useState(
    Object.keys(projects)[0] as ProjectKey,
  );
  const key = projects[selected]
    ? selected
    : (Object.keys(projects)[0] as ProjectKey);
  const project = projects[key];
  const [message, setMessage] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const run = (action: () => void) => {
    try {
      action();
      setMessage("模拟状态已更新");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败");
    }
  };
  const presets: [Scenario, string][] = [
    ["fresh", "全新曲线"],
    ["half", "曲线 50%"],
    ["ninety", "曲线 90%"],
    ["near", "接近毕业"],
    ["ready", "迁移准备"],
    ["processing", "迁移处理中"],
    ["operating", "运行阶段"],
  ];
  return (
    <div className="internal-console">
      <div className="internal-banner">INTERNAL · 演示控制工具</div>
      <PageHeader
        eyebrow="DEMO TOOLS"
        title="模拟控制台"
        description="独立的演示工具，仅用于本地模拟情景。正常产品界面不提供这些控制。"
      />
      <DetailCard title="一键演示情景">
        <p className="small-note">
          全新发行会创建新的模拟经济体；其余预设会替换所选项目的演示状态。项目资金不会与其他经济体混合。
        </p>
        <div className="demo-buttons">
          {demoPresets.map((p) => (
            <Button
              variant="secondary"
              key={p.id}
              onClick={() =>
                run(() => {
                  simulationStore.setState({
                    failNextTrade: false,
                    failNextOperating: false,
                  });
                  const next = applyDemoPreset(
                    simulationStore.getState(),
                    key,
                    p.id,
                  );
                  setSelected(next);
                })
              }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </DetailCard>
      <DetailCard title="曲线 · 演示项目">
        <Select
          label="选择项目"
          value={key}
          onChange={(value) => setSelected(value as ProjectKey)}
          options={Object.entries(projects).map(([value, p]) => ({
            value,
            label: `${p.name} · ${p.symbol} · ${p.projectId}`,
          }))}
        />
        <div className="inline">
          <LifecycleBadge state={project.lifecycle} />
          <Link className="text-link" href={projectRoute(project)}>
            查看项目 ↗
          </Link>
        </div>
        <div className="demo-buttons">
          {presets
            .filter(([scenario]) =>
              ["fresh", "half", "ninety", "near"].includes(scenario),
            )
            .map(([scenario, label]) => (
              <Button
                variant="secondary"
                key={scenario}
                onClick={() =>
                  run(() =>
                    simulationStore.getState().seedScenario(key, scenario),
                  )
                }
              >
                {label}
              </Button>
            ))}
        </div>
      </DetailCard>
      <div className="overview-grid">
        <DetailCard title="生命周期 · 迁移情景">
          <div className="demo-buttons">
            {presets
              .filter(([scenario]) =>
                ["ready", "processing", "operating"].includes(scenario),
              )
              .map(([scenario, label]) => (
                <Button
                  key={scenario}
                  variant="secondary"
                  onClick={() =>
                    run(() =>
                      simulationStore.getState().seedScenario(key, scenario),
                    )
                  }
                >
                  {label}
                </Button>
              ))}
          </div>
          <div className="demo-buttons">
            <Button
              disabled={project.lifecycle !== "MIGRATION_READY"}
              onClick={() =>
                run(() => simulationStore.getState().startMigration(key))
              }
            >
              开始迁移
            </Button>
            <Button
              disabled={project.lifecycle !== "MIGRATING"}
              onClick={() =>
                run(() => simulationStore.getState().completeMigration(key))
              }
            >
              完成迁移
            </Button>
            <Button
              variant="secondary"
              disabled={project.lifecycle !== "MIGRATING"}
              onClick={() =>
                run(() => simulationStore.getState().failMigration(key))
              }
            >
              模拟迁移失败
            </Button>
          </div>
          <p className="small-note">
            失败将返回准备状态；只有完成后才显示最终交易池与 POL 结果。
          </p>
        </DetailCard>
        <DetailCard title="全局 · 模拟资产">
          <div className="demo-buttons">
            <Button
              variant="secondary"
              onClick={() => run(() => simulationStore.getState().fundDemo())}
            >
              补充模拟 USDT
            </Button>
          </div>
        </DetailCard>
        <DetailCard title="失败情景 · 曲线交易">
          <div className="demo-buttons">
            <Button
              variant="secondary"
              onClick={() =>
                run(() => simulationStore.getState().setTradeFailure())
              }
            >
              下一笔交易失败
            </Button>
          </div>
        </DetailCard>
        <DetailCard title="重置演示">
          <div className="demo-buttons">
            <Modal
              open={resetOpen}
              onOpenChange={setResetOpen}
              trigger={<Button variant="secondary">重置演示数据</Button>}
              title="重置演示数据"
              description="将移除当前浏览器创建的经济体、交易与迁移记录，并恢复初始模拟数据。"
            >
              <Button
                onClick={() => {
                  simulationStore.getState().reset();
                  setResetOpen(false);
                  setMessage("已恢复初始模拟数据");
                }}
              >
                确认重置
              </Button>
            </Modal>
          </div>
        </DetailCard>
      </div>
      {project.lifecycle === "OPERATING" && (
        <OperatingDemo key={key} project={project} />
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
