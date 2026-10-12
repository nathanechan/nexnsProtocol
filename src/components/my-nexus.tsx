"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import { displayAmount } from "../domain/economics/amount";
import { validPrices } from "../domain/economics/operating";
import {
  personalRows,
  userActionTypes,
  actionLabels,
} from "../product/read-model";
import { portfolioSummary } from "../product/portfolio";
import { projectName } from "../product/metadata";
import { projectRoute } from "../domain/identity";
import { date } from "../product/format";
import { ProductTabs } from "./product-tabs";
import { EconomyLink, OutcomeEvents } from "./result-views";
import { CompactResults, SummaryStrip } from "./compact-results";
import {
  PageHeader,
  Select,
  LifecycleBadge,
  EmptyState,
  KeyValueList,
} from "./ui";
const amount = (v: bigint, s = "USDT") => `${displayAmount(v)} ${s}`;
export function MyNexus() {
  const { t, locale } = useLocale();
  const projects = useSimulation((s) => s.projects),
    books = useSimulation((s) => s.operatingBooks),
    user = useSimulation((s) => s.currentUser),
    activities = useSimulation((s) => s.activities),
    balances = useSimulation((s) => s.exactBalances);
  const rows = useMemo(
    () =>
      personalRows({
        projects,
        operatingBooks: books,
        currentUser: user,
        activities,
        exactBalances: balances,
      }),
    [projects, books, user, activities, balances],
  );
  const [tab, setTab] = useState(() =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tab") === "projects"
        ? "projects"
        : "overview",
    ),
    [status, setStatus] = useState("all"),
    [projectFilter, setProjectFilter] = useState("all"),
    [actionFilter, setActionFilter] = useState("all");
  const summary = portfolioSummary(rows),
    value = (n: bigint | null) => (n === null ? "N/A" : amount(n));
  const claimRows = rows.filter((r) => BigInt(r.member?.claimable ?? "0") > 0n);
  const lots = rows.flatMap((r) =>
    (r.member?.lots ?? [])
      .filter((l) => status === "all" || l.status === status)
      .map((l) => ({ r, l })),
  );
  const events = activities.filter(
    (a) =>
      a.wallet === user.wallet &&
      userActionTypes.includes(a.type as (typeof userActionTypes)[number]) &&
      (projectFilter === "all" || a.projectKey === projectFilter) &&
      (actionFilter === "all" || a.type === actionFilter),
  );
  const rewards = rows.filter(
    (r) =>
      status === "all" ||
      (status === "claimable"
        ? BigInt(r.member?.claimable ?? "0") > 0n
        : BigInt(r.member?.lifetimeClaimed ?? "0") > 0n),
  );
  const projectRows = (
    <div className="portfolio-project-rows">
      <CompactResults
        caption={t("我的项目")}
        columns={[
          "项目 / 代币",
          "生命周期",
          "钱包代币",
          "活跃头寸价值",
          "我的质押",
          "可领取",
        ]}
        rows={rows.map((r) => [
          <EconomyLink key={r.key} p={r.p} />,
          <LifecycleBadge key="stage" state={r.p.lifecycle} />,
          amount(r.balance, r.p.symbol),
          amount(r.principal),
          amount(r.staked, r.p.symbol),
          BigInt(r.member?.claimable ?? "0") > 0n ? (
            <Link
              key="claim"
              className="text-link"
              href={projectRoute(r.p) + "?tab=claim"}
            >
              {amount(BigInt(r.member!.claimable), r.p.symbol)} · {t("去领取")}
            </Link>
          ) : (
            amount(0n, r.p.symbol)
          ),
        ])}
      />
    </div>
  );
  return (
    <div className="secondary-page portfolio-page">
      <PageHeader
        eyebrow={t("资产")}
        title={t("资产")}
        description={t("跨项目查看持仓、头寸、质押与已结算权益。")}
      />
      <SummaryStrip
        items={[
          {
            label: "可领取估值",
            value: value(summary.claimable),
            className: "summary-claimable",
          },
          {
            label: "活跃头寸价值",
            value: amount(summary.principal),
            className: "summary-position",
          },
          {
            label: "总质押价值",
            value: value(summary.staked),
            className: "summary-stake",
          },
          {
            label: "代币资产估值",
            value: value(summary.tokens),
            className: "summary-tokens",
          },
          {
            label: "活跃项目",
            value: summary.activeProjects,
            className: "summary-projects",
          },
        ]}
      />
      <div className="portfolio-claimable">
        <strong>{t("可领取奖励")}</strong>
        <div className="portfolio-reward-list">
          {claimRows.length ? (
            claimRows.map((r) => (
              <Link
                className="text-link"
                key={r.key}
                href={projectRoute(r.p) + "?tab=claim"}
              >
                <span data-user-text>{projectName(r.p, locale)}</span> ·{" "}
                {t("去领取")}
              </Link>
            ))
          ) : (
            <span>{t("暂无可领取奖励")}</span>
          )}
        </div>
      </div>
      <ProductTabs
        label={t("个人资产分类")}
        items={[
          { value: "overview", label: "总览" },
          { value: "projects", label: "Projects" },
          { value: "positions", label: "头寸" },
          { value: "stakes", label: "Stakes" },
          { value: "rewards", label: "奖励" },
          { value: "contribution", label: "网络" },
          { value: "activity", label: "活动" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setStatus("all");
        }}
      >
        {tab === "activity" ? (
          <section>
            <div className="filter-row">
              <Select
                label={t("活动项目筛选")}
                value={projectFilter}
                onChange={setProjectFilter}
                options={[
                  { value: "all", label: "全部项目" },
                  ...rows.map((r) => ({
                    value: r.key,
                    label: `${projectName(r.p, locale)} · ${r.p.projectId}`,
                  })),
                ]}
              />
              <Select
                label={t("活动类型筛选")}
                value={actionFilter}
                onChange={setActionFilter}
                options={[
                  { value: "all", label: "全部操作" },
                  ...userActionTypes.map((v) => ({
                    value: v,
                    label: actionLabels[v],
                  })),
                ]}
              />
            </div>
            <OutcomeEvents events={events} />
          </section>
        ) : !rows.length ? (
          <EmptyState
            title={t("开始你的协议参与")}
            description={t(
              "买入曲线代币或参与运行中的项目后，你的资产与权益会同步到这里。",
            )}
          />
        ) : tab === "overview" || tab === "projects" ? (
          <>
            {tab === "overview" && (
              <div className="portfolio-context">
                <span>
                  USDT · BSC: {amount(BigInt(balances["56:usdt"] ?? "0"))}
                </span>
                <small>
                  {t("资产估值按可用参考价展示，不同代币数量不相加。")}
                </small>
              </div>
            )}
            {projectRows}
          </>
        ) : tab === "positions" ? (
          <>
            <div className="filter-row">
              <Select
                label={t("头寸状态筛选")}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "全部头寸" },
                  { value: "ACTIVE", label: "活跃" },
                  { value: "COMPLETED", label: "已完成" },
                ]}
              />
            </div>
            <CompactResults
              caption={t("我的头寸")}
              columns={[
                "项目",
                "头寸",
                "参与资金",
                "生命周期容量",
                "已使用",
                "剩余",
                "状态",
              ]}
              rows={lots.map(({ r, l }) => [
                <EconomyLink key={r.key} p={r.p} tab="positions" />,
                <details key={l.id} className="personal-lot">
                  <summary>
                    {t("头寸")} {l.id.replace(/^DEMO-LOT-/, "")}
                  </summary>
                  <KeyValueList
                    items={[
                      { label: "创建时间", value: date(l.createdAt) },
                      { label: "完成时间", value: date(l.completedAt) },
                    ]}
                  />
                </details>,
                amount(BigInt(l.principal)),
                amount(BigInt(l.capacity)),
                amount(BigInt(l.used)),
                amount(BigInt(l.capacity) - BigInt(l.used)),
                t(l.status === "ACTIVE" ? "活跃" : "已完成"),
              ])}
            />
            {!lots.length && <p>{t("此项目没有符合筛选的头寸。")}</p>}
            <p className="small-note">
              {t("参与资金不可赎回；生命周期容量不代表保证收益。")}
            </p>
          </>
        ) : tab === "stakes" ? (
          <CompactResults
            caption={t("我的质押")}
            columns={[
              "项目",
              "我的质押",
              "质押价值",
              "覆盖率",
              "当前档位",
              "状态",
            ]}
            rows={rows.map((r) => [
              <EconomyLink key={r.key} p={r.p} tab="stake" />,
              amount(r.staked, r.p.symbol),
              r.staked === 0n ? amount(0n) : value(r.stakeValue),
              r.coverage === null
                ? "N/A"
                : `${displayAmount(r.coverage * 100n, 2)}%`,
              r.tier.index === null
                ? "N/A"
                : t(
                    ["未达覆盖", "基础覆盖", "增强覆盖", "高覆盖", "完整覆盖"][
                      r.tier.index
                    ],
                  ),
              t(r.staked > 0n ? "已质押" : "未质押"),
            ])}
          />
        ) : tab === "contribution" ? (
          <CompactResults
            caption={t("我的网络")}
            columns={["项目", "贡献值", "网络权重", "有效网络", "网络奖励"]}
            rows={rows.map((r) => [
              <EconomyLink key={r.key} p={r.p} tab="contribution" />,
              r.book && validPrices(r.book.prices)
                ? displayAmount(r.network?.value ?? 0n)
                : "N/A",
              r.book && validPrices(r.book.prices)
                ? `${displayAmount((r.network?.weight ?? 0n) * 100n, 2)}%`
                : "N/A",
              r.network?.activeNetwork ?? 0,
              amount(BigInt(r.member?.networkEarned ?? "0"), r.p.symbol),
            ])}
          />
        ) : (
          <>
            <div className="filter-row">
              <Select
                label={t("奖励状态筛选")}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "全部权益" },
                  { value: "claimable", label: "可领取" },
                  { value: "claimed", label: "已领取" },
                ]}
              />
            </div>
            <CompactResults
              caption={t("我的奖励")}
              columns={[
                "项目",
                "可领取",
                "最近结算",
                "累计毛收益",
                "累计毛领取",
              ]}
              rows={rewards.map((r) => [
                <EconomyLink key={r.key} p={r.p} tab="claim" />,
                BigInt(r.member?.claimable ?? "0") > 0n ? (
                  <Link
                    key="claim"
                    className="text-link"
                    href={projectRoute(r.p) + "?tab=claim"}
                  >
                    {t("去领取")}
                  </Link>
                ) : (
                  amount(0n, r.p.symbol)
                ),
                date(r.book?.settlements.at(-1)?.completedAt ?? null),
                amount(BigInt(r.member?.lifetimeEarned ?? "0"), r.p.symbol),
                amount(BigInt(r.member?.lifetimeClaimed ?? "0"), r.p.symbol),
              ])}
            />
            {rewards.map((r) => (
              <section className="reward-history" key={r.key}>
                <strong data-user-text>
                  {projectName(r.p, locale)} · {r.p.symbol}
                </strong>
                <details>
                  <summary>{t("历史结算")}</summary>
                  <CompactResults
                    caption={t("我的结算历史")}
                    columns={["结算日", "已结算", "状态"]}
                    rows={[...(r.book?.settlements ?? [])]
                      .reverse()
                      .map((d) => [
                        d.day,
                        amount(
                          BigInt(d.members[user.wallet]?.gross ?? "0"),
                          r.p.symbol,
                        ),
                        t(d.status === "FINALIZED" ? "已结算" : "未生成奖励"),
                      ])}
                  />
                </details>
                <details>
                  <summary>{t("领取历史")}</summary>
                  <CompactResults
                    caption={t("我的领取历史")}
                    columns={["时间", "毛领取", "实际到账"]}
                    rows={(r.book?.claims ?? [])
                      .filter((c) => c.wallet === user.wallet)
                      .map((c) => [
                        date(c.timestamp),
                        amount(BigInt(c.gross), r.p.symbol),
                        amount(BigInt(c.received), r.p.symbol),
                      ])}
                  />
                </details>
              </section>
            ))}
          </>
        )}
      </ProductTabs>
    </div>
  );
}
