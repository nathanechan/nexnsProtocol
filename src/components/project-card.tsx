"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "../domain/models";
import { projectRoute } from "../domain/identity";
import { money, number, percent, price, curvePercent } from "../product/format";
import { ProjectLogo } from "./project-logo";
import { ContractAddress, LifecycleBadge } from "./ui";
export function Progress({ value }: { value: number | null }) {
  const { t } = useLocale();

  return (
    <div className="curve-progress">
      <div className="progress-caption">
        <span>{t("曲线进度")}</span>
        <strong>{t(curvePercent(value))}</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={t("曲线进度")}
        aria-valuenow={value == null ? undefined : value * 100}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, (value ?? 0) * 100))}%`,
          }}
        />
      </div>
    </div>
  );
}
export function ProjectCard({
  project,
  rank,
}: {
  project: Project;
  rank?: number;
}) {
  const { t } = useLocale();

  const curve = project.lifecycle === "CURVE_OPEN";
  const op = project.operating;
  return (
    <article className="economy-card card">
      <Link
        className="card-open"
        href={projectRoute(project)}
        aria-label={t(
          `查看 ${project.name} ${project.symbol} BSC ${project.tokenContract}`,
        )}
      />
      <div className="economy-card-header">
        <div className="project-logo" aria-hidden>
          <ProjectLogo logo={project.logo} />
        </div>
        <div className="identity-body">
          <h3>
            {project.name} <small>{project.symbol}</small>
          </h3>
          <div className="identity-meta">
            <span>{t("BSC")}</span>
            <ContractAddress address={project.tokenContract} />
          </div>
        </div>
        {t(
          !project.isPlatformToken && rank && (
            <span className="rank">{t(String(rank).padStart(2, "0"))}</span>
          ),
        )}
      </div>
      <div className="card-stage">
        <LifecycleBadge state={project.lifecycle} />
        {t(
          project.isPlatformToken && (
            <span className="badge platform-badge">{t("NEXNS｜平台币")}</span>
          ),
        )}
        <ArrowUpRight size={15} aria-hidden />
      </div>
      {t(
        curve ? (
          <>
            <Progress value={project.curve.progress} />
            <dl className="card-data">
              <div>
                <dt>{t("当前曲线价格")}</dt>
                <dd>{t(price(project.curve.curvePrice))}</dd>
              </div>
              <div>
                <dt>{t("净储备")}</dt>
                <dd>{t(money(project.curve.netReserve))}</dd>
              </div>
              <div>
                <dt>{t("剩余代币")}</dt>
                <dd>
                  {t(number(project.curve.remainingInventory))} {project.symbol}
                </dd>
              </div>
              <div>
                <dt>{t("24H 成交量")}</dt>
                <dd>{t(money(project.curve.volume24h))}</dd>
              </div>
              <div>
                <dt>{t("参与人数")}</dt>
                <dd>{t(number(project.curve.participants))}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="operating-primary">
              <span>{t("资金规模 · TVL")}</span>
              <strong>{t(money(op?.tvl))}</strong>
            </div>
            <dl className="card-data">
              <div>
                <dt>{t("代币价格")}</dt>
                <dd>{t(price(op?.tokenPrice))}</dd>
              </div>
              <div>
                <dt>{t("24H 变化")}</dt>
                <dd>{t(percent(op?.change24h))}</dd>
              </div>
              <div>
                <dt>{t("24H 成交量")}</dt>
                <dd>{t(money(op?.volume24h))}</dd>
              </div>
              <div>
                <dt>{t("活跃参与人数")}</dt>
                <dd>{t(number(op?.activeParticipants))}</dd>
              </div>
              <div>
                <dt>{t("流动性")}</dt>
                <dd>{t(money(op?.liquidity))}</dd>
              </div>
            </dl>
          </>
        ),
      )}
    </article>
  );
}
