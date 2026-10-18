"use client";
import { useLocale } from "../i18n/locale";
import Link from "next/link";
import type { Activity, Project } from "../domain/models";
import { projectRoute } from "../domain/identity";
import { displayAmount } from "../domain/economics/amount";
import { chronological, actionLabels } from "../product/read-model";
import { date, localTime, money, poolLabel } from "../product/format";
import {
  ContractAddress,
  DataTable,
  DetailCard,
  EmptyState,
  KeyValueList,
  LifecycleBadge,
  WalletAddress,
} from "./ui";
import { ProjectLogo } from "./project-logo";
export function EconomyLink({ p, tab }: { p: Project; tab?: string }) {
  return (
    <Link
      className="text-link"
      href={projectRoute(p) + (tab ? `?tab=${tab}` : "")}
    >
      <span className="portfolio-token-logo">
        <ProjectLogo
          logo={p.logo}
          identity={`${p.chainId}:${p.tokenContract}`}
          platform={p.isPlatformToken}
        />
      </span>
      <span data-user-text>{p.symbol}</span> ↗
    </Link>
  );
}
export function OutcomeEvents({ events }: { events: Activity[] }) {
  const { t, locale } = useLocale();

  return events.length ? (
    <ol className="activity-feed">
      {t(
        chronological(events)
          .slice(0, 100)
          .map((a) => (
            <li key={a.id}>
              <span className="activity-dot" />
              <div>
                <strong>
                  {t(actionLabels[a.type])} · {t(a.displayValues.summary)}
                </strong>
                <small>
                  {a.projectId} · {localTime(a.timestamp, locale)}
                </small>
                <WalletAddress address={a.wallet} />
              </div>
            </li>
          )),
      )}
    </ol>
  ) : (
    <EmptyState description={t("完成操作后，结果记录会显示在这里。")} />
  );
}
export function ResultTrend({
  title,
  points,
  unit,
}: {
  title: string;
  points: { day: string; value: bigint }[];
  unit: string;
}) {
  const { t } = useLocale();

  const absolute = (v: bigint) => (v < 0n ? -v : v);
  const max = points.reduce(
    (m, p) => (absolute(p.value) > m ? absolute(p.value) : m),
    1n,
  );
  return (
    <DetailCard title={t(title)}>
      {t(
        points.length ? (
          <>
            <div
              className="result-bars"
              role="img"
              aria-label={t(`${title}，下方表格提供完整数据`)}
            >
              {t(
                points.slice(-14).map((p) => (
                  <div key={p.day} className="result-bar-column">
                    <strong>{t(displayAmount(p.value, 2))}</strong>
                    <div
                      className={`result-bar ${p.value < 0n ? "negative" : ""}`}
                      style={{
                        height: `${Math.max(2, Number((absolute(p.value) * 100n) / max))}%`,
                      }}
                    />
                    <small>{t(p.day.slice(5))}</small>
                  </div>
                )),
              )}
            </div>
            <details>
              <summary>
                {t("查看图表数据 ·")}
                {t(unit)}
              </summary>
              <DataTable
                caption={t(title)}
                columns={["日期 · UTC", unit]}
                rows={points.map((p) => [p.day, displayAmount(p.value)])}
              />
            </details>

            {t(
              points.some((p) => p.value < 0n) && (
                <p className="small-note">
                  {t("柱高表示变化量大小；负值表示净流出。")}
                </p>
              ),
            )}
          </>
        ) : (
          <EmptyState description={t("尚无可绘制的结果记录。")} />
        ),
      )}
    </DetailCard>
  );
}
export function LiquidityResults({ p }: { p: Project }) {
  const { t } = useLocale();

  return (
    <DetailCard title={t("协议流动性 · POL")}>
      <KeyValueList
        items={[
          ...p.migration.resultingPools.map((pool) => ({
            label: poolLabel(pool.pair, p.symbol),
            value: `${money(pool.liquidity)}`,
          })),
          {
            label: "总流动性",
            value: p.operating ? `${money(p.operating.liquidity)}` : "尚未建立",
          },
          {
            label: "POL 价值",
            value:
              p.operating?.polValue != null
                ? `${money(p.operating.polValue)}`
                : "N/A",
          },
          {
            label: "交易池状态",
            value: p.lifecycle === "OPERATING" ? "已建立" : "待迁移",
          },
          { label: "最近更新", value: date(p.updatedAt ?? p.createdAt) },
        ]}
      />
    </DetailCard>
  );
}
export function RegistryTable({ projects }: { projects: Project[] }) {
  const { t } = useLocale();

  return (
    <DataTable
      caption={t("项目合约注册表")}
      columns={["项目 / 注册 ID", "链", "代币合约", "状态", "池地址"]}
      rows={projects.map((p) => [
        <span key={p.projectId}>
          <EconomyLink p={p} />
          <small>{p.projectId}</small>
        </span>,
        `BSC · ${p.chainId}`,
        <ContractAddress key={p.tokenContract} address={p.tokenContract} />,
        <LifecycleBadge showHealthy key={p.lifecycle} state={p.lifecycle} />,
        "N/A",
      ])}
    />
  );
}
