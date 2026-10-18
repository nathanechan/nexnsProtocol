"use client";
import { projectName } from "../product/metadata";
import { useLocale } from "../i18n/locale";
import { useMemo, useState } from "react";
import { simulationStore, useSimulation } from "../simulation/store";
import { projectKey, projectRoute } from "../domain/identity";
import type { Project, ProjectKey } from "../domain/models";
import {
  activePrincipal,
  contributions,
  coverage,
  validPrices,
} from "../domain/economics/operating";
import { displayAmount, UNIT } from "../domain/economics/amount";
import {
  activityTrend,
  creatorCurveRevenue,
  supplyResult,
  chronological,
  creatorRevenueHistory,
  publicOutcomes,
  publicResultTrend,
} from "../product/read-model";
import { date, money, price, number, percent } from "../product/format";
import {
  Button,
  ContractAddress,
  DetailCard,
  EmptyState,
  Input,
  KeyValueList,
  LifecycleBadge,
  MetricCard,
  PageHeader,
  PriceStatusBadge,
  Skeleton,
  WalletAddress,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import { LiquidityResults, OutcomeEvents, ResultTrend } from "./result-views";
import { CompactResults } from "./compact-results";
import { ProjectLogo } from "./project-logo";
import Link from "next/link";
const modules = [
  { value: "dashboard", label: "总览" },
  { value: "participants", label: "参与者" },
  { value: "growth", label: "增长" },
  { value: "network", label: "网络" },
  { value: "liquidity", label: "流动性" },
  { value: "treasury", label: "财库" },
  { value: "token", label: "代币" },
  { value: "revenue", label: "收入" },
  { value: "analytics", label: "分析" },
  { value: "lifecycle", label: "生命周期" },
];
function MetadataEditor({ p }: { p: Project }) {
  const { t } = useLocale();

  const wallet = useSimulation((s) => s.currentUser.wallet);
  const [logo, setLogo] = useState(p.logo),
    [website, setWebsite] = useState(
      p.links?.find((l) => ["官网", "Website"].includes(l.label))?.url ?? "",
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const owner = wallet.toLowerCase() === p.creatorWallet.toLowerCase();
  if (!owner)
    return (
      <DetailCard title={t("项目资料")}>
        <p>{t("仅创建者可编辑项目资料。")}</p>
        <WalletAddress address={p.creatorWallet} />
        <div className="public-links">
          {t(
            p.links?.map((l) => (
              <a
                href={l.url}
                key={l.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(l.label)} ↗
              </a>
            )),
          )}
        </div>
      </DetailCard>
    );
  return (
    <DetailCard title={t("更新项目资料")}>
      <form
        className="metadata-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await new Promise((r) => setTimeout(r, 150));
            simulationStore
              .getState()
              .updateMetadata(projectKey(p.chainId, p.tokenContract), {
                logo,
                links: [
                  ...(p.links ?? []).filter(
                    (l) => !["官网", "Website"].includes(l.label),
                  ),
                  { label: "官网", url: website },
                ],
              });
            setMessage("资料已更新");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "更新失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("文字标识")}
          <Input
            aria-label={t("文字标识")}
            value={logo.startsWith("data:") ? "" : logo}
            maxLength={4}
            onChange={(e) => setLogo(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          {t("Logo 图片")}
          <span className="file-upload-control">
            <span>{t("选择图片")}</span>
            <input
              aria-label={t("Logo 图片")}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (
                  f.size > 250000 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(f.type)
                ) {
                  setMessage("请选择不超过 250 KB 的 PNG、JPEG 或 WebP 图片");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setLogo(String(reader.result));
                  setMessage("");
                };
                reader.onerror = () => setMessage("图片读取失败");
                reader.readAsDataURL(f);
              }}
            />
          </span>
        </label>
        <div className="project-logo">
          <ProjectLogo
            logo={logo}
            identity={`${p.chainId}:${p.tokenContract}`}
            platform={p.isPlatformToken}
          />
        </div>
        <label>
          {t("官网链接")}
          <Input
            aria-label={t("官网链接")}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t("https://")}
            disabled={busy}
          />
        </label>
        <details>
          <summary>{t("社区链接")}</summary>
          {t(
            (p.links ?? [])
              .filter((l) => !["官网", "Website"].includes(l.label))
              .map((l) => (
                <p key={l.label}>
                  {t(l.label)} · {l.url}
                </p>
              )),
          )}
          <p className="small-note">
            {t("现有社区链接保持有效。新增或更新可在下方提交。")}
          </p>
        </details>
        <LinkEditor p={p} logo={logo} />
        <Button type="submit" loading={busy} disabled={busy}>
          {t(busy ? "保存中…" : "保存资料")}
        </Button>
        <p className="small-note">
          {t("名称、符号、供应、费用及经济参数固定。")}
        </p>
        <p role="status" aria-live="polite">
          {t(message)}
        </p>
      </form>
    </DetailCard>
  );
}
function LinkEditor({ p, logo }: { p: Project; logo: string }) {
  const { t } = useLocale();

  const [label, setLabel] = useState(""),
    [url, setUrl] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="link-editor">
      <label>
        {t("链接名称")}
        <Input
          value={label}
          aria-label={t("链接名称")}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={32}
        />
      </label>
      <label>
        {t("社区链接地址")}
        <Input
          value={url}
          aria-label={t("社区链接地址")}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          try {
            simulationStore
              .getState()
              .updateMetadata(projectKey(p.chainId, p.tokenContract), {
                logo,
                links: [
                  ...(p.links ?? []).filter((l) => l.label !== label),
                  { label, url },
                ],
              });
            setMessage("链接已更新");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "更新失败");
          }
        }}
      >
        {t("更新链接")}
      </Button>
      <p role="status">{t(message)}</p>
    </div>
  );
}
export function CreatorStudio({ projectId }: { projectId: string }) {
  const { t, locale } = useLocale();

  const projects = useSimulation((s) => s.projects),
    books = useSimulation((s) => s.operatingBooks),
    curves = useSimulation((s) => s.curves),
    activities = useSimulation((s) => s.activities),
    hydrated = useSimulation((s) => s.hydrated);
  const p = Object.values(projects).find((p) => p.projectId === projectId);
  const [tab, setTab] = useState("dashboard");
  const key = p ? projectKey(p.chainId, p.tokenContract) : null;
  const events = useMemo(
    () =>
      key
        ? chronological(
            activities.filter(
              (a) => a.projectKey === key && a.type !== "LIFECYCLE",
            ),
          )
        : [],
    [activities, key],
  );
  const b = key ? books[key] : undefined;
  const prices = b ? validPrices(b.prices) : null;
  const graph = useMemo(
    () => (b ? contributions(b.members, prices?.stake ?? null) : {}),
    [b, prices?.stake],
  );
  if (!p)
    return hydrated ? (
      <EmptyState title={t("未找到工作室")} description={t("未找到此项目。")} />
    ) : (
      <Skeleton />
    );
  const identity = key as ProjectKey,
    supply = supplyResult({ operatingBooks: books }, p),
    fee = creatorCurveRevenue({ curves, activities }, identity);
  const members = Object.values(b?.members ?? {}).filter(
    (m) => m.lots.length || BigInt(m.staked) > 0n || m.bound,
  );
  const contributors = Object.values(graph).filter(
    (c) => c.eligible && c.value > 0n,
  );
  const op = p.operating;
  const treasury = (
    <DetailCard title={t("财库公开结果")}>
      <KeyValueList
        items={[
          {
            label: "财库余额",
            value: op ? `${money(op.treasuryBalance)}` : "N/A",
          },
          {
            label: "POL 价值",
            value: op?.polValue != null ? `${money(op.polValue)}` : "N/A",
          },
          {
            label: "总流动性",
            value: op ? `${money(op.liquidity)}` : "尚未建立",
          },
          {
            label: "已销毁",
            value: `${displayAmount(supply.burned)} ${p.symbol}`,
          },
          { label: "最近更新", value: date(p.updatedAt ?? p.createdAt) },
        ]}
      />
    </DetailCard>
  );
  const trendPanels = (
    <>
      <ResultTrend
        title={t("成交量趋势")}
        points={activityTrend(events, "volume")}
        unit="USDT"
      />
      <ResultTrend
        title={t("新增参与钱包")}
        points={activityTrend(events, "participants")}
        unit="钱包"
      />
      <ResultTrend
        title={t("新增参与资金")}
        points={activityTrend(events, "positions")}
        unit="USDT"
      />
      <ResultTrend
        title={t("质押净变化")}
        points={activityTrend(events, "stake")}
        unit={p.symbol}
      />
      <ResultTrend
        title={t("奖励结算趋势")}
        points={(b?.settlements ?? []).map((d) => ({
          day: d.day,
          value: BigInt(d.gross),
        }))}
        unit={p.symbol}
      />
      <ResultTrend
        title={t("领取趋势")}
        points={activityTrend(events, "claims")}
        unit={p.symbol}
      />
      <ResultTrend
        title={t("流动性公开结果趋势")}
        points={publicResultTrend(b, "liquidity")}
        unit="USDT"
      />
    </>
  );
  return (
    <div className="secondary-page studio-page" data-nexns-ui="v2">
      <PageHeader
        eyebrow={t("CREATOR STUDIO")}
        title={t("工作室")}
        description=""
        action={
          <Link className="button secondary" href={projectRoute(p)}>
            {t("查看项目 ↗")}
          </Link>
        }
      />
      <div className="studio-identity card">
        <span className="studio-project-logo">
          <ProjectLogo
            logo={p.logo}
            identity={key ?? p.projectId}
            platform={p.isPlatformToken}
          />
        </span>
        <span className="studio-project-name" data-user-text>
          <strong>{p.symbol}</strong>
        </span>
        <LifecycleBadge showHealthy state={p.lifecycle} />
        <span>
          {p.projectId} {t("· BSC")}
        </span>
        <ContractAddress address={p.tokenContract} />
      </div>
      <ProductTabs
        label={t("工作室模块")}
        items={modules}
        value={tab}
        onChange={setTab}
      >
        {t(
          tab === "dashboard" ? (
            <>
              <div className="project-metrics">
                {t(
                  p.lifecycle === "CURVE_OPEN" ? (
                    <>
                      <MetricCard
                        label={t("曲线进度")}
                        value={percent(p.curve.progress)}
                      />
                      <MetricCard
                        label={t("净储备")}
                        value={`${money(p.curve.netReserve)}`}
                      />
                      <MetricCard
                        label={t("参与关系")}
                        value={p.curve.participants}
                      />
                      <MetricCard
                        label={t("24H 曲线成交量")}
                        value={`${money(p.curve.volume24h)}`}
                      />
                    </>
                  ) : (
                    <>
                      <MetricCard
                        label={t("仓位价值")}
                        value={
                          op?.activePositionValue != null
                            ? `${money(op.activePositionValue)}`
                            : null
                        }
                      />
                      <MetricCard
                        label={t("参与关系")}
                        value={op?.activeParticipants ?? null}
                      />
                      <MetricCard
                        label={t("质押数量")}
                        value={
                          op ? `${number(op.totalStaked)} ${p.symbol}` : null
                        }
                      />
                      <MetricCard
                        label={t("可领取")}
                        value={`${displayAmount(members.reduce((n, m) => n + BigInt(m.claimable), 0n))} ${p.symbol}`}
                      />
                    </>
                  ),
                )}
              </div>
              <div className="overview-grid">
                <DetailCard title={t("项目状态")}>
                  <KeyValueList
                    items={[
                      {
                        label: "生命周期",
                        value: (
                          <LifecycleBadge showHealthy state={p.lifecycle} />
                        ),
                      },
                      {
                        label: "价格状态",
                        value: (
                          <PriceStatusBadge
                            showHealthy
                            status={p.priceStatus}
                          />
                        ),
                      },
                      { label: "有效贡献者", value: contributors.length },
                      {
                        label: "总贡献值 · 有效用户",
                        value: prices
                          ? displayAmount(
                              contributors.reduce((n, c) => n + c.value, 0n),
                            )
                          : "N/A",
                      },
                      { label: "领取记录", value: b?.claims.length ?? 0 },
                      {
                        label: "成交量 · 24H",
                        value: `${money(op?.volume24h ?? p.curve.volume24h)}`,
                      },
                      {
                        label: "创建者曲线收入",
                        value: `${displayAmount(fee)} USDT`,
                      },
                      {
                        label: "创建者运行收入",
                        value: b
                          ? `${displayAmount(BigInt(b.creatorAccrued))} ${p.symbol}`
                          : "N/A",
                      },
                      {
                        label: "最近更新",
                        value: date(p.updatedAt ?? p.createdAt),
                      },
                    ]}
                  />
                </DetailCard>
                {t(
                  p.lifecycle === "CURVE_OPEN" ? (
                    <DetailCard title={t("最近交易")}>
                      <OutcomeEvents
                        events={events
                          .filter((a) => a.type === "BUY" || a.type === "SELL")
                          .slice(0, 8)}
                      />
                    </DetailCard>
                  ) : (
                    treasury
                  ),
                )}
                <MetadataEditor key={identity} p={p} />
              </div>
            </>
          ) : tab === "participants" ? (
            <>
              {t(
                members.length ? (
                  <CompactResults
                    caption={t("运行阶段参与者")}
                    columns={[
                      "钱包",
                      "活跃本金 · USDT",
                      "活跃仓位",
                      "质押数量",
                      "质押价值 · USDT",
                      "覆盖率",
                      "贡献值",
                      "可领取 / 已结算",
                      "最后活动",
                    ]}
                    rows={members.map((m) => {
                      const c = coverage(
                        activePrincipal(m),
                        BigInt(m.staked),
                        prices?.stake ?? null,
                      );
                      return [
                        <WalletAddress key={m.wallet} address={m.wallet} />,
                        displayAmount(activePrincipal(m)),
                        m.lots.filter((l) => l.status === "ACTIVE").length,
                        `${displayAmount(BigInt(m.staked))} ${p.symbol}`,
                        prices
                          ? displayAmount(
                              (BigInt(m.staked) * prices.stake) / UNIT,
                            )
                          : "N/A",
                        c === null ? "N/A" : `${displayAmount(c * 100n, 2)}%`,
                        prices
                          ? displayAmount(graph[m.wallet]?.value ?? 0n)
                          : "N/A",
                        `${displayAmount(BigInt(m.claimable))} / ${displayAmount(BigInt(m.lifetimeEarned))} ${p.symbol}`,
                        date(
                          events.find((a) => a.wallet === m.wallet)
                            ?.timestamp ??
                            m.lots.at(-1)?.createdAt ??
                            null,
                        ),
                      ];
                    })}
                  />
                ) : (
                  <CompactResults
                    caption={t("曲线参与钱包 · 已记录")}
                    columns={["钱包", "最后交易"]}
                    rows={[
                      ...new Set(
                        events
                          .filter((a) => a.type === "BUY" || a.type === "SELL")
                          .map((a) => a.wallet),
                      ),
                    ].map((w) => [
                      <WalletAddress key={w} address={w} />,
                      date(
                        events.find((a) => a.wallet === w)?.timestamp ?? null,
                      ),
                    ])}
                  />
                ),
              )}
            </>
          ) : tab === "growth" ? (
            <>
              <div className="project-metrics">
                <MetricCard
                  label={t("已记录活跃钱包")}
                  value={
                    new Set(
                      events
                        .filter((a) =>
                          [
                            "BUY",
                            "SELL",
                            "PARTICIPATE",
                            "STAKE",
                            "UNSTAKE",
                            "CLAIM",
                          ].includes(a.type),
                        )
                        .map((a) => a.wallet),
                    ).size
                  }
                />
                <MetricCard
                  label={t("24H 成交量")}
                  value={`${money(op?.volume24h ?? p.curve.volume24h)}`}
                />
                <MetricCard label={t("7D 市场成交量")} value={null} />
              </div>
              <div className="overview-grid">
                <ResultTrend
                  title={t("新增参与钱包")}
                  points={activityTrend(events, "participants")}
                  unit="钱包"
                />
                <ResultTrend
                  title={t("新增参与资金")}
                  points={activityTrend(events, "positions")}
                  unit="USDT"
                />
                <ResultTrend
                  title={t("质押净变化")}
                  points={activityTrend(events, "stake")}
                  unit={p.symbol}
                />
              </div>
            </>
          ) : tab === "network" ? (
            <>
              <div className="project-metrics">
                <MetricCard
                  label={t("有效贡献者")}
                  value={prices ? contributors.length : null}
                />
                <MetricCard
                  label={t("总贡献值 · 有效用户")}
                  value={
                    prices
                      ? displayAmount(
                          contributors.reduce((n, c) => n + c.value, 0n),
                        )
                      : null
                  }
                />
                <MetricCard
                  label={t("有效分支关系")}
                  value={
                    prices
                      ? Object.values(graph).reduce(
                          (n, c) => n + c.activeBranches,
                          0,
                        )
                      : null
                  }
                />
                <MetricCard
                  label={t("累计网络收益")}
                  value={`${displayAmount(members.reduce((n, m) => n + BigInt(m.networkEarned), 0n))} ${p.symbol}`}
                />
              </div>
              <CompactResults
                caption={t("贡献钱包 · 无竞争排名")}
                columns={["钱包", "贡献值", "有效网络", "网络收益"]}
                rows={members.map((m) => [
                  <WalletAddress key={m.wallet} address={m.wallet} />,
                  prices ? displayAmount(graph[m.wallet]?.value ?? 0n) : "N/A",
                  graph[m.wallet]?.activeNetwork ?? 0,
                  `${displayAmount(BigInt(m.networkEarned))} ${p.symbol}`,
                ])}
              />
            </>
          ) : tab === "liquidity" ? (
            <LiquidityResults p={p} />
          ) : tab === "treasury" ? (
            <div className="overview-grid">
              {t(treasury)}
              <DetailCard title={t("最近公开结果")}>
                <OutcomeEvents
                  events={publicOutcomes({
                    projects,
                    operatingBooks: books,
                    activities,
                  }).filter(
                    (a) =>
                      a.projectKey === identity &&
                      [
                        "MIGRATION_COMPLETED",
                        "CLAIM",
                        "SUPPLY_BURNED",
                        "POL_UPDATED",
                      ].includes(a.type),
                  )}
                />
              </DetailCard>
              <DetailCard title={t("财库公开结果历史")}>
                <CompactResults
                  caption={t("财库结果历史")}
                  columns={[
                    "时间",
                    "财库余额 · USDT",
                    "POL · USDT",
                    "流动性 · USDT",
                    "已销毁",
                  ]}
                  rows={[...(b?.publicResults ?? [])]
                    .reverse()
                    .map((r) => [
                      date(r.timestamp),
                      displayAmount(BigInt(r.treasury)),
                      r.pol === null ? "N/A" : displayAmount(BigInt(r.pol)),
                      displayAmount(BigInt(r.liquidity)),
                      `${displayAmount(BigInt(r.burned))} ${p.symbol}`,
                    ])}
                />
              </DetailCard>
            </div>
          ) : tab === "token" ? (
            <DetailCard title={t("代币身份与供应")}>
              <KeyValueList
                items={[
                  { label: "代币名称", value: projectName(p, locale) },
                  { label: "符号", value: p.symbol },
                  {
                    label: "代币合约",
                    value: <ContractAddress address={p.tokenContract} />,
                  },
                  { label: "链", value: `BSC · ${p.chainId}` },
                  {
                    label: "当前总供应",
                    value: `${displayAmount(supply.total)} ${p.symbol}`,
                  },
                  {
                    label: "累计发行",
                    value: `${displayAmount(supply.minted)} ${p.symbol}`,
                  },
                  {
                    label: "已销毁",
                    value: `${displayAmount(supply.burned)} ${p.symbol}`,
                  },
                  { label: "流通供应", value: "N/A" },
                  ...(p.lifecycle === "CURVE_OPEN"
                    ? [
                        {
                          label: "曲线可售库存",
                          value: `${number(p.curve.remainingInventory)} ${p.symbol}`,
                        },
                      ]
                    : [
                        {
                          label: "市场参考价",
                          value:
                            prices && op?.tokenPrice != null
                              ? `${price(op.tokenPrice)}`
                              : "N/A",
                        },
                        {
                          label: "市值",
                          value:
                            prices && op?.marketCap != null
                              ? `${money(op.marketCap)}`
                              : "N/A",
                        },
                      ]),
                ]}
              />
            </DetailCard>
          ) : tab === "revenue" ? (
            <>
              <div className="overview-grid">
                <DetailCard title={t("创建者收入结果")}>
                  <KeyValueList
                    items={[
                      {
                        label: "曲线费用收入",
                        value: `${displayAmount(fee)} USDT`,
                      },
                      {
                        label: "运行阶段收入",
                        value: `${displayAmount(BigInt(b?.creatorAccrued ?? "0"))} ${p.symbol}`,
                      },
                      {
                        label: "累计收入",
                        value: `${displayAmount(fee)} USDT / ${displayAmount(BigInt(b?.creatorAccrued ?? "0"))} ${p.symbol}`,
                      },
                      {
                        label: "可领取创建者收入",
                        value: "N/A",
                      },
                    ]}
                  />
                </DetailCard>
                <DetailCard title={t("收入历史")}>
                  <CompactResults
                    caption={t("创建者已记录收入")}
                    columns={["时间", "来源", "收入"]}
                    rows={creatorRevenueHistory(
                      { operatingBooks: books, activities },
                      identity,
                    ).map((r) => [
                      date(r.timestamp),
                      r.kind,
                      `${displayAmount(r.amount)} ${r.asset === "TOKEN" ? p.symbol : r.asset}`,
                    ])}
                  />
                </DetailCard>
              </div>
            </>
          ) : tab === "analytics" ? (
            <div className="overview-grid">
              {t(trendPanels)}
              <DetailCard title={t("流动性结果历史")}>
                <OutcomeEvents
                  events={events.filter(
                    (a) => a.type === "MIGRATION_COMPLETED",
                  )}
                />
              </DetailCard>
            </div>
          ) : (
            <div className="overview-grid">
              <DetailCard title={t("项目历程")}>
                <KeyValueList
                  items={[
                    { label: "创建", value: date(p.createdAt) },
                    { label: "曲线开放", value: date(p.createdAt) },
                    {
                      label: "曲线完成",
                      value: date(curves[identity]?.completedAt ?? null),
                    },
                    {
                      label: "迁移准备",
                      value: date(curves[identity]?.completedAt ?? null),
                    },
                    { label: "迁移开始", value: date(p.migration.startedAt) },
                    { label: "运行开始", value: date(p.migration.completedAt) },
                    {
                      label: "当前生命周期",
                      value: <LifecycleBadge showHealthy state={p.lifecycle} />,
                    },
                    {
                      label: "当前价格质量",
                      value: (
                        <PriceStatusBadge showHealthy status={p.priceStatus} />
                      ),
                    },
                  ]}
                />
              </DetailCard>
              <DetailCard title={t("生命周期记录")}>
                <OutcomeEvents
                  events={events.filter((a) =>
                    [
                      "CREATE",
                      "CURVE_COMPLETED",
                      "MIGRATION_COMPLETED",
                    ].includes(a.type),
                  )}
                />
              </DetailCard>
            </div>
          ),
        )}
      </ProductTabs>
    </div>
  );
}
