"use client";
import { useLocale } from "../i18n/locale";
import { useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  Layers3,
  Activity as ActivityIcon,
} from "lucide-react";
import { useSimulation } from "../simulation/store";
import { ProjectLogo } from "./project-logo";
import { economyService, type EconomyDataService } from "../data/service";
import { useResource } from "../product/use-resource";
import { money, number, percent, date } from "../product/format";
import { projectKey, projectRoute } from "../domain/identity";
import type { Project } from "../domain/models";
import {
  Button,
  ContractAddress,
  DataFreshness,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  Skeleton,
} from "./ui";
const loadNetwork = () => economyService.network();
function LeaderSection({
  title,
  subtitle,
  projects,
  metric,
  href,
}: {
  title: string;
  subtitle: string;
  projects: Project[];
  metric: "progress" | "tvl" | "created" | "migrated";
  href: string;
}) {
  const { t } = useLocale();

  return (
    <section className="card leader-section">
      <div className="section-heading">
        <div>
          <h2>{t(title)}</h2>
          <p>{t(subtitle)}</p>
        </div>
        <Link className="text-link" href={href}>
          {t("查看全部")}
          <ArrowRight size={14} />
        </Link>
      </div>
      {t(
        !projects.length ? (
          <EmptyState description={t("当前没有此阶段的项目。")} />
        ) : (
          <div>
            {t(
              projects.map((p, i) => (
                <div
                  className="leader-row"
                  key={projectKey(p.chainId, p.tokenContract)}
                >
                  {!p.isPlatformToken && (
                    <span className="rank">
                      {String(
                        i + (projects[0]?.isPlatformToken ? 0 : 1),
                      ).padStart(2, "0")}
                    </span>
                  )}
                  <div className="project-logo" aria-hidden>
                    <ProjectLogo logo={p.logo} />
                  </div>
                  <div className="identity-body">
                    <Link href={projectRoute(p)} className="project-link">
                      {p.name} <span>{p.symbol}</span>
                    </Link>
                    <div className="identity-meta">
                      <span>{t("BSC")}</span>
                      <ContractAddress address={p.tokenContract} />
                    </div>
                  </div>
                  <div className="leader-value">
                    <strong>
                      {t(
                        metric === "progress"
                          ? percent(p.curve.progress)
                          : metric === "tvl"
                            ? money(p.operating?.tvl)
                            : date(
                                metric === "created"
                                  ? p.createdAt
                                  : p.migration.completedAt,
                              ).slice(0, 10),
                      )}
                    </strong>
                    <small>
                      {t(
                        metric === "progress"
                          ? "曲线进度"
                          : metric === "tvl"
                            ? "资金规模"
                            : metric === "created"
                              ? "创建日期 · UTC"
                              : "迁移日期 · UTC",
                      )}
                    </small>
                  </div>
                </div>
              )),
            )}
          </div>
        ),
      )}
    </section>
  );
}
export function NetworkPage({ service }: { service?: EconomyDataService }) {
  const { t } = useLocale();

  const revision = useSimulation((s) => s.revision);
  const load = useCallback(() => {
    void revision;
    return service ? service.network() : loadNetwork();
  }, [service, revision]);
  const state = useResource(load);
  const d = state.data;
  return (
    <>
      <PageHeader
        eyebrow={t("NEXNS NETWORK")}
        title={t("网络总览")}
        description={t("全平台项目、流动性与参与动态，一览当前网络状态。")}
        action={
          <Link href="/create" className="button primary">
            {t("创建项目 ↗")}
          </Link>
        }
      />
      {t(
        state.error ? (
          <ErrorState onRetry={state.retry} />
        ) : state.loading ? (
          <div className="network-metrics">
            {t(Array.from({ length: 7 }, (_, i) => <Skeleton key={i} />))}
          </div>
        ) : (
          d && (
            <>
              {t(
                d.total === 0 ? (
                  <EmptyState
                    title={t("网络尚无项目")}
                    description={t("创建第一个项目，或稍后回来查看。")}
                    action={
                      <Link href="/create" className="button secondary">
                        {t("创建项目")}
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <div className="network-metrics">
                      <MetricCard
                        label={t("项目总数")}
                        value={number(d.total)}
                        detail={t("全部生命周期")}
                      />
                      <MetricCard
                        label={t("曲线发行中")}
                        value={number(d.curveCount)}
                      />
                      <MetricCard
                        label={t("运行中")}
                        value={number(d.operatingCount)}
                      />
                      <MetricCard
                        label={t("参与人数")}
                        value={number(d.participants)}
                        detail={t("项目参与关系合计，非去重钱包")}
                      />
                      <MetricCard
                        label={t("24H 成交量")}
                        value={number(d.volume24h)}
                        detail={t("USDT · 曲线与市场成交")}
                      />
                      <MetricCard
                        label={t("总资金规模")}
                        value={number(d.tvl)}
                        detail={t("USDT · TVL")}
                      />
                      <MetricCard
                        label={t("总流动性")}
                        value={number(d.liquidity)}
                        detail={t("USDT · 已建立交易池")}
                      />
                    </div>
                    <div className="network-context">
                      <span>
                        <Globe2 size={15} /> {t("BSC 网络")}
                      </span>
                      <span>
                        <Layers3 size={15} /> {t("两阶段项目")}
                      </span>
                      <DataFreshness timestamp={d.updatedAt} />
                    </div>
                    <div className="leader-grid">
                      <LeaderSection
                        title={t("曲线领先项目")}
                        subtitle="按曲线进度排列"
                        projects={d.curveLeaders}
                        metric="progress"
                        href="/explore?stage=curve&sort=progress"
                      />
                      <LeaderSection
                        title={t("运行期领先项目")}
                        subtitle="按资金规模排列"
                        projects={d.operatingLeaders}
                        metric="tvl"
                        href="/explore?stage=operating&sort=tvl"
                      />
                      <LeaderSection
                        title={t("最近创建")}
                        subtitle="新进入曲线发行阶段的项目"
                        projects={d.recentCreated}
                        metric="created"
                        href="/explore?stage=curve&sort=newest"
                      />
                      <LeaderSection
                        title={t("最近迁移")}
                        subtitle="已完成迁移，进入运行阶段"
                        projects={d.recentMigrated}
                        metric="migrated"
                        href="/explore?stage=operating&sort=tvl"
                      />
                    </div>
                    <section className="card activity-section">
                      <div className="section-heading">
                        <div>
                          <h2>
                            <ActivityIcon size={18} />
                            {t("网络动态")}
                          </h2>
                          <p>{t("用户可见的项目状态与活动结果")}</p>
                        </div>
                      </div>
                      {t(
                        !d.activities.length ? (
                          <EmptyState
                            description={t("目前没有网络活动记录。")}
                          />
                        ) : (
                          <ol className="activity-feed">
                            {t(
                              d.activities.map((a) => {
                                const p = [
                                  ...d.curveLeaders,
                                  ...d.operatingLeaders,
                                  ...d.recentCreated,
                                  ...d.recentMigrated,
                                ].find((p) => p.projectId === a.projectId);
                                return (
                                  <li key={a.id}>
                                    <span
                                      className="activity-dot"
                                      aria-hidden
                                    />
                                    <div>
                                      <strong>
                                        {t(a.displayValues.summary)}
                                      </strong>
                                      <p>
                                        {t(
                                          p ? (
                                            <Link href={projectRoute(p)}>
                                              {p.name} · {p.symbol}
                                            </Link>
                                          ) : (
                                            <span>
                                              {t("项目")}
                                              {a.projectId}
                                            </span>
                                          ),
                                        )}
                                      </p>
                                    </div>
                                    <time dateTime={a.timestamp}>
                                      {t(date(a.timestamp))}
                                    </time>
                                  </li>
                                );
                              }),
                            )}
                          </ol>
                        ),
                      )}
                    </section>
                  </>
                ),
              )}
            </>
          )
        ),
      )}
      {t(
        state.error && (
          <Button variant="ghost" onClick={state.retry}>
            {t("重新加载网络")}
          </Button>
        ),
      )}
    </>
  );
}
