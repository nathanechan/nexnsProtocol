"use client";
import { ProjectLogo } from "./project-logo";
import type { ProjectKey } from "../domain/models";
import { OperatingActionForm } from "./operating-panels";
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
import { compactUsdtValue } from "../product/market-format";
import { portfolioSummary } from "../product/portfolio";
import { projectName } from "../product/metadata";
import { projectRoute } from "../domain/identity";
import { localTime } from "../product/format";
import { ProductTabs } from "./product-tabs";
import { EconomyLink, OutcomeEvents } from "./result-views";
import { CompactResults, SummaryStrip } from "./compact-results";
import {
  PageHeader,
  Select,
  LifecycleBadge,
  EmptyState,
  KeyValueList,
  Button,
} from "./ui";
const amount = (v: bigint, s = "USDT") => `${displayAmount(v)} ${s}`;
export function MyNexus() {
  const { t, locale } = useLocale();
  const date = (value: string | null | undefined) =>
    value ? localTime(value, locale) : t("暂无记录");
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
  const [claimProject, setClaimProject] = useState<ProjectKey | null>(null);
  const [claimReceipt, setClaimReceipt] = useState("");
  const summary = portfolioSummary(rows),
    value = compactUsdtValue;
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
        columns={["项目 / 代币", "钱包代币", "仓位", "已质押", "可领取"]}
        rows={rows.map((r) => [
          <span key={r.key}>
            <EconomyLink p={r.p} />
            <LifecycleBadge state={r.p.lifecycle} />
          </span>,
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
    <div className="secondary-page portfolio-page" data-nexns-ui="v2">
      <PageHeader eyebrow={t("资产")} title={t("资产")} description="" />
      <SummaryStrip
        items={[
          {
            label: locale === "en" ? "Token assets" : "代币资产",
            value: value(summary.tokens),
            className: "summary-tokens",
          },
          {
            label: locale === "en" ? "Position" : "仓位",
            value: amount(summary.principal),
            className: "summary-position",
          },
          {
            label: locale === "en" ? "Staked" : "质押",
            value: value(summary.staked),
            className: "summary-stake",
          },
          {
            label: "可领取",
            value: value(summary.claimable),
            className: "summary-claimable",
          },
          {
            label: locale === "en" ? "Projects" : "项目",
            value: summary.activeProjects,
            className: "summary-projects",
          },
        ]}
      />
      <div className="portfolio-claimable">
        {claimRows.length > 0 && <strong>{t("可领取")}</strong>}
        <div className="portfolio-reward-list">
          {claimRows.length ? (
            claimRows.map((r) => (
              <div className="portfolio-claim-row" key={r.key}>
                <span className="portfolio-token-logo">
                  <ProjectLogo
                    logo={r.p.logo}
                    identity={r.key}
                    platform={r.p.isPlatformToken}
                  />
                </span>
                <Link
                  className="portfolio-claim-identity"
                  href={projectRoute(r.p)}
                >
                  <strong data-token-symbol data-user-text>
                    {r.p.symbol}
                  </strong>
                  {r.p.name !== r.p.symbol && (
                    <small data-token-name data-user-text>
                      {projectName(r.p, locale)}
                    </small>
                  )}
                </Link>
                <span className="portfolio-claim-amount">
                  <strong data-user-text>
                    {amount(BigInt(r.member!.claimable), r.p.symbol)}
                  </strong>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClaimReceipt("");
                    setClaimProject(r.key);
                  }}
                >
                  {t("领取")}
                </Button>
              </div>
            ))
          ) : (
            <span className="portfolio-claim-empty">
              {locale === "en"
                ? "No claimable assets right now"
                : "当前暂无可领取资产"}
            </span>
          )}
        </div>
      </div>
      {claimProject && projects[claimProject] && (
        <div className="portfolio-claim-form">
          <OperatingActionForm
            key={claimProject}
            project={projects[claimProject]}
            kind="claim"
            onSuccess={(received) => {
              setClaimReceipt(
                `${locale === "en" ? "Claim successful · Received" : "领取成功 · 实际到账"} ${received} ${projects[claimProject].symbol}`,
              );
              setClaimProject(null);
            }}
          />
          <Button variant="ghost" onClick={() => setClaimProject(null)}>
            {t("关闭")}
          </Button>
        </div>
      )}
      <p
        className={
          claimReceipt ? "portfolio-claim-receipt operation-success" : "sr-only"
        }
        role="status"
        aria-live="polite"
      >
        {claimReceipt}
      </p>
      <ProductTabs
        label={t("个人资产分类")}
        items={[
          { value: "overview", label: "总览" },
          { value: "projects", label: "Projects" },
          { value: "positions", label: "Positions" },
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
            title={t("暂无资产")}
            description={t("买入或参与项目后，资产会显示在这里。")}
          />
        ) : tab === "overview" || tab === "projects" ? (
          <>
            {tab === "overview" && (
              <div className="portfolio-context">
                <span>
                  USDT · BSC: {amount(BigInt(balances["56:usdt"] ?? "0"))}
                </span>
              </div>
            )}
            {projectRows}
          </>
        ) : tab === "positions" ? (
          <>
            <div className="filter-row">
              <Select
                label={t("仓位状态筛选")}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "全部仓位" },
                  { value: "ACTIVE", label: "活跃" },
                  { value: "COMPLETED", label: "已完成" },
                ]}
              />
            </div>
            <CompactResults
              caption={t("我的仓位")}
              emptyLabel="暂无仓位"
              columns={[
                "项目",
                "仓位",
                "参与资金",
                "收益额度",
                "已使用",
                "剩余",
                "状态",
              ]}
              rows={lots.map(({ r, l }) => [
                <EconomyLink key={r.key} p={r.p} tab="positions" />,
                <details key={l.id} className="personal-lot">
                  <summary>
                    {t("仓位")} {l.id.replace(/^DEMO-LOT-/, "")}
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
          </>
        ) : tab === "stakes" ? (
          <CompactResults
            caption={t("已质押")}
            emptyLabel="暂无质押"
            columns={[
              "项目",
              "已质押",
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
            columns={["项目", "贡献值", "网络权重", "有效网络", "网络收益"]}
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
              columns={["项目", "可领取", "最近结算", "累计收益", "累计领取"]}
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
                  {r.p.symbol} · {projectName(r.p, locale)}
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
