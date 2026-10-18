"use client";
import { AnimatedAmount } from "./animated-amount";
import { stakedValue } from "../simulation/live-market";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project, Activity } from "../domain/models";
import { projectKey } from "../domain/identity";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import {
  marketPrice,
  marketChange,
  compactMarketNumber,
} from "../product/market-format";
import {
  money,
  number,
  percent,
  date,
  curvePercent,
  poolLabel,
} from "../product/format";
import { displayAmount } from "../domain/economics/amount";
import {
  ContractAddress,
  LifecycleBadge,
  PriceStatusBadge,
  KeyValueList,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import { ProjectLogo } from "./project-logo";
import { OperatingCharts } from "./operating-charts";
import { CurveMarketChart } from "./curve-market-chart";
import { marketHistory } from "../product/market-history";
import { TradePanel, CurveHoldings } from "./trade-panel";
import {
  OperatingActionForm,
  StakePanel,
  PositionLots,
  ContributionPanel,
  RewardsPanel,
  OperatingActivity,
  TransparencyPanel,
  useOperating,
} from "./operating-panels";
import { PublicInfo, ProjectActivity } from "./project-details";
function UserState({ project }: { project: Project }) {
  const { t } = useLocale();
  const s = useOperating(project);
  return (
    <dl className="terminal-user-state" aria-label={t("我的项目状态")}>
      {[
        ["我的仓位", `${displayAmount(s.principal)} USDT`],
        [
          "已质押",
          `${displayAmount(BigInt(s.member.staked))} ${project.symbol}`,
        ],
        [
          "覆盖率",
          percent(s.coverage === null ? null : Number(s.coverage) / 1e18),
        ],
        [
          "可领取",
          `${displayAmount(BigInt(s.member.claimable))} ${project.symbol}`,
        ],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{t(label)}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function TokenTerminal({
  project,
  initialActivities,
}: {
  project: Project;
  initialActivities: Activity[];
}) {
  const { locale, t } = useLocale();
  const op = project.lifecycle === "OPERATING",
    curve = project.lifecycle === "CURVE_OPEN";
  const key = projectKey(project.chainId, project.tokenContract);
  const wallet = useSimulation((s) => s.currentUser.wallet);
  const all = useSimulation((s) => s.activities);
  const live = useSimulation((s) => s.liveMarket);
  const history = curve ? marketHistory(project, all, live) : [];
  const quoteChange = op
    ? project.operating?.change24h
    : history.length >= 2
      ? history.at(-1)! / history[0] - 1
      : null;
  const activities = all.filter((a) => a.projectKey === key);
  const ledger = useSimulation((s) => s.curves[key]);
  const [action, setAction] = useState("participate"),
    [detail, setDetail] = useState(op ? "positions" : "activity");
  useEffect(() => {
    if (op) {
      const requested = new URLSearchParams(window.location.search).get("tab");
      setDetail(
        requested &&
          [
            "positions",
            "contribution",
            "rewards",
            "activity",
            "transparency",
            "info",
          ].includes(requested)
          ? requested
          : "positions",
      );
    }
  }, [op]);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && ["participate", "stake", "claim"].includes(tab)) setAction(tab);
    if (
      tab &&
      [
        "contribution",
        "positions",
        "rewards",
        "assets",
        "activity",
        "transparency",
      ].includes(tab)
    )
      setDetail(tab === "assets" ? "positions" : tab);
  }, []);
  const quotePrice =
    curve || !op
      ? project.curve.curvePrice
      : (project.operating?.tokenPrice ?? null);
  const actionItems = [
    { value: "participate", label: t("参与") },
    { value: "stake", label: t("质押") },
    { value: "claim", label: locale === "zh-CN" ? "领取" : "Claim" },
  ];
  const detailItems = [
    ...(op
      ? [
          {
            value: "positions",
            label: locale === "zh-CN" ? "仓位" : "Positions",
          },
          { value: "contribution", label: t("贡献") },
          { value: "rewards", label: t("奖励") },
        ]
      : []),
    { value: "activity", label: t("活动") },
    { value: "transparency", label: t("透明度") },
    { value: "info", label: locale === "zh-CN" ? "资料" : "Details" },
  ];
  const stats = curve
    ? [
        ["曲线进度", curvePercent(project.curve.progress)],
        [
          "距离曲线完成",
          money(
            Math.max(0, project.curve.targetReserve - project.curve.netReserve),
            2,
          ),
        ],
        ["24H 成交量", compactMarketNumber(project.curve.volume24h, true)],
        ["参与地址", number(project.curve.participants)],
      ]
    : [
        ["价格", marketPrice(project.operating?.tokenPrice ?? null)],
        [
          "总质押",
          `${compactMarketNumber(project.operating?.totalStaked ?? null)} ${project.symbol}`,
        ],
        [
          "质押价值",
          compactMarketNumber(
            stakedValue(
              project.operating?.totalStaked ?? 0,
              project.operating?.tokenPrice ?? null,
            ),
            true,
          ),
        ],
        [
          "流动性",
          compactMarketNumber(project.operating?.liquidity ?? null, true),
        ],
        ["参与人数", number(project.operating?.activeParticipants)],
      ];
  void initialActivities;
  return (
    <div
      className={`terminal-v3 token-terminal project-page ${curve ? "terminal-curve" : "terminal-operating"} ${op ? "terminal-flagship" : ""}`}
      data-lifecycle={project.lifecycle}
      data-nexns-ui="v2"
    >
      <header className="terminal-header">
        <span className="terminal-logo" aria-hidden>
          <ProjectLogo
            logo={project.logo}
            identity={`${project.chainId}:${project.tokenContract}`}
            platform={project.isPlatformToken}
          />
        </span>
        <div className="terminal-identity">
          <h1>
            <span data-token-symbol data-user-text title={project.symbol}>
              {project.symbol}
            </span>
          </h1>
          <div className="terminal-header-meta">
            {!curve && !op && <LifecycleBadge state={project.lifecycle} />}
            {wallet.toLowerCase() === project.creatorWallet.toLowerCase() && (
              <Link className="text-link" href={`/studio/${project.projectId}`}>
                {locale === "zh-CN" ? "管理" : "Manage"}
              </Link>
            )}
            <ContractAddress address={project.tokenContract} />
            {project.priceStatus !== "VALID" && (
              <PriceStatusBadge status={project.priceStatus} />
            )}
            {project.isPlatformToken && (
              <Link className="text-link" href="/nexns">
                NEXNS
              </Link>
            )}
          </div>
        </div>
        <div className="terminal-price">
          <strong key={quotePrice ?? "unavailable"}>
            {marketPrice(quotePrice)}
          </strong>
          <span
            className={
              (quoteChange ?? 0) > 0
                ? "positive"
                : (quoteChange ?? 0) < 0
                  ? "negative"
                  : ""
            }
          >
            {quoteChange != null ? marketChange(quoteChange) : "—"}
          </span>
        </div>
      </header>
      <div className="terminal-layout">
        <dl className="terminal-market-strip">
          {stats.map(([label, value], index) =>
            (op || curve) && index === 0 ? null : (
              <div key={label}>
                <dt>
                  {op
                    ? (locale === "en"
                        ? ["Price", "Staked", "Value", "Liquidity", "Addresses"]
                        : ["价格", "总质押", "质押价值", "流动性", "参与地址"])[
                        index
                      ]
                    : t(label)}
                </dt>
                <dd>
                  {op && index === 1 ? (
                    <>
                      <AnimatedAmount
                        value={project.operating?.totalStaked ?? 0}
                      />{" "}
                      <span data-user-text>{project.symbol}</span>
                    </>
                  ) : op &&
                    index === 2 &&
                    project.operating?.tokenPrice != null ? (
                    <AnimatedAmount
                      value={stakedValue(
                        project.operating.totalStaked,
                        project.operating.tokenPrice,
                      )!}
                      currency
                    />
                  ) : op &&
                    index === 0 &&
                    project.operating?.tokenPrice != null ? (
                    <AnimatedAmount
                      value={project.operating.tokenPrice}
                      price
                    />
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ),
          )}
        </dl>
        <section className="terminal-workspace">
          {curve ? (
            <section className="terminal-chart">
              <div className="terminal-progress">
                <strong>{curvePercent(project.curve.progress)}</strong>
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, project.curve.progress * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {money(project.curve.netReserve, 2)} /{" "}
                  {money(project.curve.targetReserve)}
                </small>
              </div>
              <CurveMarketChart project={project} />
            </section>
          ) : op ? (
            <OperatingCharts project={project} />
          ) : (
            <section className="terminal-migration" role="status">
              <h2>
                {t(
                  project.lifecycle === "MIGRATION_READY"
                    ? "曲线已完成，等待迁移"
                    : "迁移处理中",
                )}
              </h2>
              <p>{t("无需用户操作。仅在迁移成功后显示最终流动性结果。")}</p>
              {project.migration.lastError && (
                <p role="alert">{t(project.migration.lastError)}</p>
              )}
              <KeyValueList
                items={[
                  { label: "曲线状态", value: "已完成" },
                  {
                    label: "迁移状态",
                    value:
                      project.lifecycle === "MIGRATION_READY"
                        ? "准备中"
                        : "处理中",
                  },
                  { label: "交易池准备", value: "待确认" },
                  { label: "协议流动性 · POL", value: "待确认" },
                  {
                    label: "最终净储备",
                    value: money(project.curve.netReserve),
                  },
                  {
                    label: "最终曲线价格",
                    value: marketPrice(project.curve.curvePrice),
                  },
                  { label: "完成时间", value: date(ledger?.completedAt) },
                ]}
              />
            </section>
          )}
          <section className="terminal-details">
            <ProductTabs
              label={t("项目功能")}
              items={detailItems}
              value={detail}
              onChange={setDetail}
            >
              <div className="terminal-detail-content">
                {detail === "positions" ? (
                  <PositionLots project={project} />
                ) : detail === "contribution" ? (
                  <ContributionPanel project={project} />
                ) : detail === "rewards" ? (
                  <RewardsPanel project={project} resultOnly />
                ) : detail === "transparency" && op ? (
                  <>
                    <TransparencyPanel project={project} />
                    <section className="terminal-history">
                      <h3>{t("生命周期")}</h3>
                      <p>
                        {t("已进入运行阶段 · 迁移完成于")}{" "}
                        {date(project.migration.completedAt)}
                      </p>
                      <KeyValueList
                        items={project.migration.resultingPools.map((pool) => ({
                          label: poolLabel(pool.pair, project.symbol),
                          value: money(pool.liquidity),
                        }))}
                      />
                    </section>
                  </>
                ) : detail === "info" || detail === "transparency" ? (
                  <PublicInfo project={project} />
                ) : op ? (
                  <OperatingActivity project={project} />
                ) : (
                  <ProjectActivity activities={activities} />
                )}
              </div>
            </ProductTabs>
          </section>
        </section>
        <aside
          id="project-actions"
          className="terminal-actions"
          aria-label={locale === "zh-CN" ? "项目操作" : "Project actions"}
        >
          {curve ? (
            <>
              <TradePanel project={project} />
            </>
          ) : op ? (
            <>
              <ProductTabs
                label={locale === "zh-CN" ? "终端操作" : "Terminal actions"}
                items={actionItems}
                value={action}
                onChange={setAction}
              >
                {action === "participate" ? (
                  <OperatingActionForm project={project} kind="participate" />
                ) : action === "stake" ? (
                  <StakePanel project={project} compact />
                ) : action === "claim" ? (
                  <OperatingActionForm project={project} kind="claim" />
                ) : null}
              </ProductTabs>
              <details className="terminal-personal">
                <summary>{locale === "en" ? "My assets" : "我的资产"}</summary>
                <UserState project={project} />
              </details>
            </>
          ) : (
            <section className="terminal-transition">
              <h2>{t("曲线交易已关闭")}</h2>
              <p>
                {t("下一阶段")} · {t("运行中")}
              </p>
              <CurveHoldings project={project} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
