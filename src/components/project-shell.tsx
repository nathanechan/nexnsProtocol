"use client";
import { useLocale } from "../i18n/locale";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Clock, ArrowRight } from "lucide-react";
import type { Activity, Project } from "../domain/models";
import { projectKey, shortAddress } from "../domain/identity";
import { useSimulation } from "../simulation/store";
import {
  money,
  poolLabel,
  number,
  percent,
  price,
  date,
  curvePercent,
  activityAmount,
} from "../product/format";
import {
  Button,
  ContractAddress,
  DataFreshness,
  DetailCard,
  EmptyState,
  KeyValueList,
  LifecycleBadge,
  MetricCard,
  PriceStatusBadge,
  ResponsiveGrid,
  Toast,
  WalletAddress,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import { Progress } from "./project-card";
import { TradePanel, CurveHoldings } from "./trade-panel";
import { ProjectLogo } from "./project-logo";
import {
  ParticipatePanel,
  StakePanel,
  ContributionPanel,
  RewardsPanel,
  AssetsPanel,
  OperatingActivity,
  TransparencyPanel,
  PersonalOverview,
  useOperating,
} from "./operating-panels";
import { CurveChart } from "./curve-chart";
function PublicInfo({ project }: { project: Project }) {
  const { t, content } = useLocale();

  return (
    <DetailCard title={t("项目资料")}>
      <p className="project-description">{content(project.description)}</p>
      <KeyValueList
        items={[
          {
            label: "项目名称",
            value: <span data-user-text>{project.name}</span>,
          },
          {
            label: "合约地址",
            value: <ContractAddress address={project.tokenContract} />,
          },
          {
            label: "创建者",
            value: <WalletAddress address={project.creatorWallet} />,
          },
          { label: "网络", value: `BSC · ${project.chainId}` },
          { label: "创建时间", value: date(project.createdAt) },
          { label: "项目 ID", value: project.projectId },
        ]}
      />
      <Link className="text-link" href={`/studio/${project.projectId}`}>
        {t("创建者工作室 ↗")}
      </Link>
      <div className="public-links">
        {t(
          project.links?.length ? (
            project.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(l.label)} ↗
              </a>
            ))
          ) : (
            <span>{t("项目链接：N/A")}</span>
          ),
        )}
      </div>
    </DetailCard>
  );
}
function ProjectActivity({ activities }: { activities: Activity[] }) {
  const { t } = useLocale();

  return (
    <DetailCard title={t("最近活动")}>
      {t(
        activities.length ? (
          <ol className="activity-feed">
            {t(
              activities.map((a) => (
                <li key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{t(a.displayValues.summary)}</strong>
                    <small>
                      {t(shortAddress(a.wallet))}
                      {t(
                        a.displayValues.received
                          ? ` · 获得 ${activityAmount(a.displayValues.received)} ${a.displayValues.receivedAsset}`
                          : "",
                      )}
                    </small>
                    <small>{t(date(a.timestamp))}</small>
                  </div>
                </li>
              )),
            )}
          </ol>
        ) : (
          <EmptyState description={t("当前项目暂无公开活动记录。")} />
        ),
      )}
    </DetailCard>
  );
}
const operatingTabs = [
  { value: "overview", label: "总览" },
  { value: "participate", label: "参与" },
  { value: "stake", label: "质押" },
  { value: "contribution", label: "贡献" },
  { value: "rewards", label: "奖励" },
  { value: "assets", label: "Assets" },
  { value: "activity", label: "活动" },
  { value: "transparency", label: "透明度" },
];
function MobileOperatingState({
  project,
  onAction,
}: {
  project: Project;
  onAction: (tab: string) => void;
}) {
  const { t } = useLocale();

  const s = useOperating(project);
  return (
    <section className="mobile-user-state" aria-label={t("我的项目状态")}>
      <div className="mobile-state-grid">
        <MetricCard
          label={t("我的头寸")}
          value={money(Number(s.principal) / 1e18)}
        />
        <MetricCard
          label={t("我的质押")}
          value={`${number(Number(s.member.staked) / 1e18)} ${project.symbol}`}
          detail={t(
            percent(s.coverage === null ? null : Number(s.coverage) / 1e18),
          )}
        />
        <MetricCard
          label={t("可领取")}
          value={`${number(Number(s.member.claimable) / 1e18, 2)} ${project.symbol}`}
        />
      </div>
      <div className="mobile-core-actions">
        <Button onClick={() => onAction("participate")}>{t("参与")}</Button>
        <Button variant="secondary" onClick={() => onAction("stake")}>
          {t("质押")}
        </Button>
        <Button variant="secondary" onClick={() => onAction("rewards")}>
          {t("领取奖励")}
        </Button>
      </div>
    </section>
  );
}
function OperatingOverview({ project }: { project: Project }) {
  const { t } = useLocale();

  const op = project.operating;
  const user = useSimulation((s) => s.currentUser);
  const key = projectKey(project.chainId, project.tokenContract);
  const stake = user.stakes.find((s) => s.projectKey === key);
  const reward = user.rewards.find((r) => r.projectKey === key);
  return (
    <>
      <PersonalOverview project={project} />
      <div className="project-metrics">
        <MetricCard
          label={t("代币价格")}
          value={price(op?.tokenPrice)}
          detail={t(`24H 变化 ${percent(op?.change24h)}`)}
        />
        <MetricCard label={t("市值")} value={money(op?.marketCap)} />
        <MetricCard label={t("24H 成交量")} value={money(op?.volume24h)} />
        <MetricCard label={t("资金规模 · TVL")} value={money(op?.tvl)} />
      </div>
      <div className="overview-grid">
        <DetailCard title={t("参与状态")}>
          <KeyValueList
            items={[
              {
                label: "活跃头寸价值",
                value: money(op?.activePositionValue),
              },
              { label: "活跃参与人数", value: number(op?.activeParticipants) },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("质押概览")}>
          <KeyValueList
            items={[
              {
                label: "总质押数量",
                value: `${number(op?.totalStaked)} ${project.symbol}`,
              },
              { label: "我的覆盖率", value: percent(stake?.coverage) },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("流动性")}>
          <KeyValueList
            items={[
              ...project.migration.resultingPools.map((pool) => ({
                label: poolLabel(pool.pair, project.symbol),
                value: money(pool.liquidity),
              })),
              { label: "总流动性", value: money(op?.liquidity) },
              { label: "协议流动性 · POL", value: money(op?.polValue) },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("奖励结果")}>
          <KeyValueList
            items={[
              {
                label: "最近已结算奖励",
                value:
                  op?.lastSettledReward == null
                    ? "N/A"
                    : `${number(op.lastSettledReward, 2)} ${project.symbol}`,
              },
              {
                label: "我的可领取",
                value: reward
                  ? `${number(reward.claimable, 2)} ${project.symbol}`
                  : "N/A",
              },
            ]}
          />
          <p className="small-note">{t("仅展示已确定的奖励结果。")}</p>
        </DetailCard>
        <DetailCard title={t("金库结果")}>
          <KeyValueList
            items={[
              { label: "金库余额", value: money(op?.treasuryBalance) },
              { label: "协议流动性 · POL", value: money(op?.polValue) },
              {
                label: "累计销毁",
                value: `${number(op?.burnedSupply)} ${project.symbol}`,
              },
              { label: "更新时间", value: date(op?.updatedAt) },
            ]}
          />
        </DetailCard>
        <DetailCard title={t("运行状态")}>
          <KeyValueList
            items={[
              {
                label: "生命周期",
                value: <LifecycleBadge state={project.lifecycle} />,
              },
              {
                label: "价格状态",
                value: <PriceStatusBadge status={project.priceStatus} />,
              },
            ]}
          />
          {t(
            project.priceStatus === "PRICE_INVALID" && (
              <p className="small-note">
                {t("参考价格暂不可用，历史权益保留。")}
              </p>
            ),
          )}
        </DetailCard>
      </div>
    </>
  );
}
export function ProjectShell({
  initialProject,
  initialActivities = [],
}: {
  initialProject: Project;
  initialActivities?: Activity[];
}) {
  const { t } = useLocale();

  const project = useSimulation(
    (s) =>
      s.projects[
        projectKey(initialProject.chainId, initialProject.tokenContract)
      ] ?? initialProject,
  );
  const allActivities = useSimulation((s) => s.activities);
  const activities = allActivities.filter(
    (a) => a.projectKey === projectKey(project.chainId, project.tokenContract),
  );
  const ledger = useSimulation(
    (s) => s.curves[projectKey(project.chainId, project.tokenContract)],
  );
  void initialActivities;
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("overview");
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("tab");
    if (
      target &&
      [
        "overview",
        "participate",
        "stake",
        "contribution",
        "rewards",
        "assets",
        "activity",
        "transparency",
      ].includes(target)
    )
      setTab(target);
  }, []);
  const curve = project.lifecycle === "CURVE_OPEN";
  const operating = project.lifecycle === "OPERATING";
  return (
    <div className="project-page">
      <div className="project-header card">
        <div className="project-logo" aria-hidden>
          <ProjectLogo logo={project.logo} />
        </div>
        <div className="identity-body">
          <h1 className="compact-project-title">
            <span className="project-name" title={project.name}>
              {project.name}
            </span>{" "}
            <small>{project.symbol}</small>
          </h1>
          <div className="inline">
            <LifecycleBadge state={project.lifecycle} />
            <PriceStatusBadge status={project.priceStatus} />
            <span>
              {t("BSC · ")}
              {t(project.chainId)}
            </span>
          </div>
          <div className="inline">
            <ContractAddress address={project.tokenContract} />
            <span className="creator-label">
              {t("创建者")} <WalletAddress address={project.creatorWallet} />
            </span>
          </div>
        </div>

        <Link className="text-link" href={`/studio/${project.projectId}`}>
          {t("创建者工作室 ↗")}
        </Link>
        <Button
          variant="ghost"
          aria-label={t("分享项目")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setMessage("项目链接已复制");
            } catch {
              setMessage("复制失败，请从地址栏复制项目链接");
            }
          }}
        >
          <span className="desktop-only">{t("分享项目")}</span> ↗
        </Button>
      </div>
      <div className="timeline" aria-label={t("项目生命周期")}>
        {t(
          ["曲线发行", "迁移过渡", "经济运行"].map((s, i) => (
            <span
              className={
                (curve ? i === 0 : operating ? i === 2 : i === 1)
                  ? "current"
                  : ""
              }
              key={s}
            >
              {t(String(i + 1).padStart(2, "0"))} {t(s)}
            </span>
          )),
        )}
      </div>
      {t(
        curve ? (
          <>
            <div className="project-metrics curve-summary">
              <MetricCard
                label={t("距离曲线完成")}
                value={money(
                  Math.max(
                    0,
                    project.curve.targetReserve - project.curve.netReserve,
                  ),
                  2,
                )}
              />
              <MetricCard
                label={t("当前曲线价格")}
                value={price(project.curve.curvePrice)}
              />
              <MetricCard
                label={t("曲线进度")}
                value={curvePercent(project.curve.progress)}
              />
              <MetricCard
                label={t("净储备")}
                value={money(project.curve.netReserve)}
              />
              <MetricCard
                label={t("剩余代币")}
                value={number(project.curve.remainingInventory)}
                detail={t(project.symbol)}
              />
              <MetricCard
                label={t("24H 成交量")}
                value={money(project.curve.volume24h)}
              />
              <MetricCard
                label={t("参与人数")}
                value={number(project.curve.participants)}
              />
            </div>
            <div className="curve-main">
              <div className="card">
                <Progress value={project.curve.progress} />
                <p className="small-note">
                  {t(money(project.curve.netReserve, 2))}{" "}
                  {t("/ 100,000 USDT 净储备目标")}
                </p>
                <CurveChart project={project} />
                <div className="graduation-distance">
                  <span>{t("距离曲线完成")}</span>
                  <strong>
                    {t(
                      money(
                        project.curve.targetReserve - project.curve.netReserve,
                        2,
                      ),
                    )}
                  </strong>
                </div>
              </div>
              <div className="curve-actions">
                <TradePanel project={project} />
                <CurveHoldings project={project} />
              </div>
            </div>
            <ResponsiveGrid>
              <PublicInfo project={project} />
              <ProjectActivity
                activities={activities.filter(
                  (a) =>
                    a.type === "BUY" ||
                    a.type === "SELL" ||
                    a.type === "CREATE",
                )}
              />
            </ResponsiveGrid>
          </>
        ) : operating ? (
          <>
            <MobileOperatingState project={project} onAction={setTab} />
            <p className="migration-completed" role="status">
              {t("已进入运行阶段 · 迁移完成于")}{" "}
              {t(date(project.migration.completedAt))} {t("· 协议流动性已确认")}
            </p>
            <ProductTabs
              label={t("项目功能")}
              items={operatingTabs}
              value={tab}
              onChange={setTab}
            >
              {t(
                tab === "overview" ? (
                  <OperatingOverview project={project} />
                ) : tab === "participate" ? (
                  <ParticipatePanel project={project} />
                ) : tab === "stake" ? (
                  <StakePanel project={project} />
                ) : tab === "contribution" ? (
                  <ContributionPanel project={project} />
                ) : tab === "rewards" ? (
                  <RewardsPanel project={project} />
                ) : tab === "assets" ? (
                  <AssetsPanel project={project} />
                ) : tab === "activity" ? (
                  <OperatingActivity project={project} />
                ) : (
                  <TransparencyPanel project={project} />
                ),
              )}
            </ProductTabs>
            <div className="project-bottom">
              <ResponsiveGrid>
                <PublicInfo project={project} />
                <ProjectActivity activities={activities} />
              </ResponsiveGrid>
            </div>
          </>
        ) : (
          <>
            <section
              className="card migration-outcome"
              role="status"
              aria-live="polite"
            >
              <div className="migration-icon">
                {t(
                  project.lifecycle === "MIGRATION_READY" ? (
                    <Check size={24} />
                  ) : (
                    <Clock size={24} />
                  ),
                )}
              </div>
              <h2>
                {t(
                  project.lifecycle === "MIGRATION_READY"
                    ? "曲线已完成，等待迁移"
                    : "迁移处理中",
                )}
              </h2>
              <p>
                {t("初始分配已完成。流动性确认后，项目将进入经济运行阶段。")}
              </p>
              {t(
                project.migration.lastError && (
                  <p role="alert" className="cap-notice">
                    {t(project.migration.lastError)}
                  </p>
                ),
              )}
              <KeyValueList
                items={[
                  {
                    label: "最终净储备",
                    value: money(project.curve.netReserve),
                  },
                  {
                    label: "最终曲线价格",
                    value: price(project.curve.curvePrice),
                  },
                  {
                    label: "已分配代币",
                    value: `${number(project.curve.soldInventory)} ${project.symbol}`,
                  },
                  { label: "完成时间", value: date(ledger?.completedAt) },
                  {
                    label: "迁移资产",
                    value: "已准备 · 100,000 USDT / 200,000 X",
                  },
                  { label: "最后更新", value: date(project.updatedAt) },
                ]}
              />
              <div className="migration-facts">
                <div>
                  <span>{t("曲线状态")}</span>
                  <strong>{t("已完成")}</strong>
                </div>
                <div>
                  <span>{t("迁移状态")}</span>
                  <strong>
                    {t(
                      project.lifecycle === "MIGRATION_READY"
                        ? "准备中"
                        : "处理中",
                    )}
                  </strong>
                </div>
                <div>
                  <span>{t("交易池准备")}</span>
                  <strong>{t("待确认")}</strong>
                </div>
                <div>
                  <span>{t("协议流动性 · POL")}</span>
                  <strong>{t("待确认")}</strong>
                </div>
              </div>
              <div className="next-stage">
                {t("下一阶段")}
                <ArrowRight size={15} /> {t("运行中")}
              </div>
              <p className="small-note">
                {t("无需用户操作。仅在迁移成功后显示最终流动性结果。")}
              </p>
            </section>
            <div className="project-bottom">
              <PublicInfo project={project} />
            </div>
          </>
        ),
      )}
      <div className="project-freshness">
        <DataFreshness
          timestamp={
            project.updatedAt ??
            project.operating?.updatedAt ??
            "2026-10-11T08:00:00Z"
          }
        />
      </div>
      <Toast message={t(message)} />
    </div>
  );
}
