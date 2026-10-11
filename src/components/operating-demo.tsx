"use client";
import { useState } from "react";
import type { Project } from "../domain/models";
import type { OperatingPreset } from "../domain/economics/operating-models";
import { simulationStore } from "../simulation/store";
import { useOperating } from "./operating-panels";
import { Button, DetailCard } from "./ui";
export function OperatingDemo({ project }: { project: Project }) {
  const s = useOperating(project);
  const [message, setMessage] = useState("");
  const run = (action: () => void) => {
    try {
      action();
      setMessage("演示状态已更新");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败");
    }
  };
  const presets: [OperatingPreset, string][] = [
    ["low", "低覆盖率"],
    ["mid", "中覆盖率"],
    ["full", "完整覆盖率"],
    ["multi", "多批次用户"],
    ["contribution", "贡献活跃"],
    ["nearCapacity", "接近容量完成"],
    ["claimable", "可领取奖励"],
  ];
  return (
    <>
      <DetailCard title="运行阶段情景">
        <p className="small-note">
          情景会替换所选项目的模拟用户、头寸和奖励记录。项目之间独立。
        </p>
        <div className="demo-buttons">
          {presets.map(([key, label]) => (
            <Button
              variant="secondary"
              key={key}
              onClick={() =>
                run(() => simulationStore.getState().seedOperating(s.key, key))
              }
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="demo-buttons">
          <Button
            variant="secondary"
            onClick={() =>
              run(() => simulationStore.getState().fundToken(s.key))
            }
          >
            补充模拟项目代币
          </Button>
        </div>
      </DetailCard>
      <DetailCard title="网络情景">
        <div className="demo-buttons">
          <Button
            variant="secondary"
            onClick={() =>
              run(() => simulationStore.getState().seedNetwork(s.key))
            }
          >
            建立推荐树
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              run(() => simulationStore.getState().seedNetwork(s.key, true))
            }
          >
            添加活跃分支
          </Button>
        </div>
      </DetailCard>
      <DetailCard title="运行阶段失败情景">
        <div className="demo-buttons">
          <Button
            variant="secondary"
            onClick={() =>
              run(() => simulationStore.getState().setOperatingFailure())
            }
          >
            下一次协议操作失败
          </Button>
        </div>
      </DetailCard>
      <DetailCard title="模拟日结">
        <p>
          模拟日期 {s.book.day} · {String(s.book.hour).padStart(2, "0")}:00 UTC
        </p>
        <p className="small-note">
          日结会推进到当日日终，确定奖励后进入次日。此前小时的参与与质押状态保留。
        </p>
        <div className="demo-buttons">
          <Button
            disabled={s.book.hour >= 24}
            variant="secondary"
            onClick={() =>
              run(() =>
                simulationStore
                  .getState()
                  .advanceHours(s.key, Math.min(6, 24 - s.book.hour)),
              )
            }
          >
            推进 6 小时
          </Button>
          <Button
            onClick={() =>
              run(() => simulationStore.getState().settleDay(s.key))
            }
          >
            结算当日
          </Button>
        </div>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </DetailCard>
    </>
  );
}
