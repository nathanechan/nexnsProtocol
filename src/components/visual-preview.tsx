"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Circle,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiscoveryMarketPage } from "./discovery-market-page";
import { ProjectShell } from "./project-shell";
import { useSimulation } from "../simulation/store";
import { useLocale } from "../i18n/locale";

export function VisualPreview() {
  const params = useSearchParams();
  const router = useRouter();
  const operating = params.get("view") === "operating";
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const projectMap = useSimulation((s) => s.projects);
  const projects = Object.values(projectMap).filter(
    (p) =>
      p.lifecycle === "OPERATING" &&
      !p.isPlatformToken &&
      p.priceStatus === "VALID",
  );
  const project =
    projects.find((p) => p.tokenContract === params.get("project")) ??
    [...projects].sort(
      (a, b) =>
        (b.operating?.activeParticipants ?? 0) -
        (a.operating?.activeParticipants ?? 0),
    )[0];
  return (
    <div className="visual-lab">
      <div
        className="direction-toolbar"
        aria-label={zh ? "视觉方案预览" : "Visual direction preview"}
      >
        <div>
          <span className="direction-dot" />
          <strong>{zh ? "视觉方案 01" : "Visual direction 01"}</strong>
          <span className="direction-caption">
            {zh ? "浅色 · 专业 · 精确" : "Light · Focused · Precise"}
          </span>
        </div>
        <nav aria-label={zh ? "预览页面" : "Preview pages"}>
          <Link
            href="/visual-preview"
            aria-current={!operating ? "page" : undefined}
          >
            <Layers size={14} />
            {zh ? "发行列表" : "Launch"}
          </Link>
          <Link
            href="/visual-preview?view=operating"
            aria-current={operating ? "page" : undefined}
          >
            <SlidersHorizontal size={14} />
            {zh ? "运行终端" : "Terminal"}
          </Link>
        </nav>
      </div>
      <div className="direction-content">
        <div className="direction-kicker">
          <span>NEXNS / {operating ? "ECONOMY" : "MARKETS"}</span>
          <span>
            <Circle size={7} fill="currentColor" />
            {zh ? "BSC 网络" : "BSC Network"}
          </span>
        </div>
        {operating && project && (
          <label className="direction-project-picker">
            <span>{zh ? "切换项目" : "Project"}</span>
            <select
              value={project.tokenContract}
              onChange={(event) => {
                const next = new URLSearchParams(params.toString());
                next.set("project", event.target.value);
                router.replace(`/visual-preview?${next}`, { scroll: false });
              }}
            >
              {projects.map((p) => (
                <option key={p.tokenContract} value={p.tokenContract}>
                  {p.symbol} · {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {operating ? (
          project ? (
            <ProjectShell initialProject={project} />
          ) : (
            <p>{zh ? "暂无运行项目" : "No operating projects"}</p>
          )
        ) : (
          <DiscoveryMarketPage
            section="launch"
            navigationPath="/visual-preview"
          />
        )}
      </div>
      <div className="direction-footnote">
        <span>
          <Check size={13} />
          {zh
            ? "沿用现有模拟数据与操作"
            : "Existing simulation data and actions"}
        </span>
        <Link href={operating ? "/live" : "/launch"}>
          {zh ? "查看当前版本" : "View current version"}
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
