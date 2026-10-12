"use client";
import { AnimatedAmount } from "./animated-amount";
import { stakedValue } from "../simulation/live-market";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Project, Activity } from "../domain/models";
import { projectKey } from "../domain/identity";
import { useLocale } from "../i18n/locale";
import { projectName } from "../product/metadata";
import { useSimulation } from "../simulation/store";
import { marketService, marketRow, type MarketRow } from "../data/market";
import { useResource } from "../product/use-resource";
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
  Button,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import { ProjectLogo } from "./project-logo";
import { StakingChart } from "./staking-chart";
import { CurveChart } from "./curve-chart";
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
function TokenSwitcher({ current }: { current: Project }) {
  const { locale, t } = useLocale();
  const [stage, setStage] = useState(
    current.lifecycle === "OPERATING" ? "live" : "launch",
  );
  useEffect(() => {
    setStage(current.lifecycle === "OPERATING" ? "live" : "launch");
  }, [current.lifecycle]);
  const revision = useSimulation((s) => s.revision);
  const projects = useSimulation((s) => s.projects);
  const load = useCallback(() => {
    void revision;
    return marketService.list(
      stage === "launch" ? "launch" : "live",
      stage === "launch" ? "progress" : "staked",
    );
  }, [stage, revision]);
  const state = useResource(load);
  const row = (original: MarketRow) => {
    const r = projects[original.key]
      ? marketRow(projects[original.key])
      : original;
    return (
      <Link
        key={r.key}
        href={r.href}
        className="switcher-row"
        aria-current={
          r.key === projectKey(current.chainId, current.tokenContract)
            ? "page"
            : undefined
        }
      >
        <span className="switcher-logo" aria-hidden>
          <ProjectLogo logo={r.logo} identity={r.key} platform={r.platform} />
        </span>
        <span>
          <strong>{r.symbol}</strong>
          {!r.platform && <small>{projectName(r, locale)}</small>}
        </span>
        <span>
          <b>{marketPrice(r.price)}</b>
          <small>
            {r.stage === "CURVE_OPEN"
              ? curvePercent(r.progress)
              : marketChange(r.change)}
          </small>
        </span>
      </Link>
    );
  };
  return (
    <aside
      className="terminal-switcher"
      aria-label={locale === "zh-CN" ? "代币切换" : "Token switcher"}
    >
      <Button
        variant="ghost"
        onClick={() => window.dispatchEvent(new Event("nexns-open-search"))}
      >
        {t("搜索")}
      </Button>
      <ProductTabs
        label={locale === "zh-CN" ? "切换项目阶段" : "Token stage filter"}
        items={[
          { value: "launch", label: locale === "zh-CN" ? "发行" : "Launch" },
          { value: "live", label: locale === "zh-CN" ? "运行" : "Live" },
        ]}
        value={stage}
        onChange={setStage}
      >
        {state.error ? (
          <Button onClick={state.retry}>{t("重试")}</Button>
        ) : state.loading ? (
          <p role="status">{locale === "zh-CN" ? "加载中" : "Loading"}</p>
        ) : (
          state.data?.map(row)
        )}
      </ProductTabs>
    </aside>
  );
}
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
  const activities = all.filter((a) => a.projectKey === key);
  const ledger = useSimulation((s) => s.curves[key]);
  const [shareStatus, setShareStatus] = useState("");
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
        ["参与人数", number(project.curve.participants)],
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
      className={`token-terminal project-page ${curve ? "terminal-curve" : "terminal-operating"}`}
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
            <span data-user-text>{project.name}</span>
            <small>{project.symbol}/USDT</small>
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
          <span>
            {marketChange(op ? (project.operating?.change24h ?? null) : null)}
          </span>
        </div>
        <Button
          variant="ghost"
          aria-label={t("分享项目")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setShareStatus(t("项目链接已复制"));
            } catch {
              setShareStatus(t("复制失败，请从地址栏复制项目链接"));
            }
          }}
        >
          ↗
        </Button>
        {op && (
          <Button
            className="dex-link"
            variant="secondary"
            disabled
            title={
              locale === "zh-CN"
                ? "交易市场暂不可用"
                : "Trading market unavailable"
            }
          >
            {locale === "zh-CN" ? "去交易 ↗" : "Trade on DEX ↗"}
          </Button>
        )}
      </header>
      {shareStatus && <p role="status">{shareStatus}</p>}
      <div className="terminal-layout">
        <TokenSwitcher current={project} />
        <dl className="terminal-market-strip">
          {stats.map(([label, value], index) => (
            <div key={label}>
              <dt>
                {op
                  ? (locale === "en"
                      ? ["Price", "Staked", "Value", "Liquidity", "Users"]
                      : ["价格", "总质押", "质押价值", "流动性", "参与人数"])[
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
                  <AnimatedAmount value={project.operating.tokenPrice} price />
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
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
              <CurveChart project={project} />
            </section>
          ) : op ? (
            <StakingChart project={project} />
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
            </ProductTabs>
          </section>
        </section>
        <aside
          className="terminal-actions"
          aria-label={locale === "zh-CN" ? "项目操作" : "Project actions"}
        >
          {curve ? (
            <>
              <TradePanel project={project} />
            </>
          ) : op ? (
            <>
              <UserState project={project} />
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
