"use client";
import { useLocale } from "../i18n/locale";
import { useMemo, useState } from "react";
import { useSimulation } from "../simulation/store";
import { displayAmount } from "../domain/economics/amount";
import {
  personalRows,
  userActionTypes,
  actionLabels,
} from "../product/read-model";
import { date } from "../product/format";
import { ProductTabs } from "./product-tabs";
import { EconomyLink, OutcomeEvents } from "./result-views";
import {
  ContractAddress,
  DetailCard,
  EmptyState,
  KeyValueList,
  MetricCard,
  PageHeader,
  Select,
  LifecycleBadge,
  DataTable,
} from "./ui";
const amount = (v: bigint, symbol = "USDT") => `${displayAmount(v)} ${symbol}`;
export function MyNexus() {
  const { t } = useLocale();

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
  const [tab, setTab] = useState("overview"),
    [status, setStatus] = useState("all"),
    [projectFilter, setProjectFilter] = useState("all"),
    [actionFilter, setActionFilter] = useState("all");
  const lots = rows.flatMap((r) =>
    (r.member?.lots ?? []).map((l) => ({ r, l })),
  );
  const principal = rows.reduce((n, r) => n + r.principal, 0n),
    active = lots.filter(({ l }) => l.status === "ACTIVE").length;
  const myEvents = activities.filter(
    (a) =>
      a.wallet === user.wallet &&
      userActionTypes.includes(a.type as (typeof userActionTypes)[number]) &&
      (projectFilter === "all" || a.projectKey === projectFilter) &&
      (actionFilter === "all" || a.type === actionFilter),
  );
  const filtered = rows.filter(
    (r) =>
      tab !== "rewards" ||
      status === "all" ||
      (status === "claimable"
        ? BigInt(r.member?.claimable ?? "0") > 0n
        : BigInt(r.member?.lifetimeClaimed ?? "0") > 0n),
  );
  return (
    <div className="portfolio-page">
      <PageHeader
        eyebrow={t("资产")}
        title={t("资产")}
        description={t("跨项目查看持仓、头寸、质押与已结算权益。")}
      />
      <div className="project-metrics">
        <MetricCard label={t("参与项目")} value={rows.length} />
        <MetricCard label={t("活跃头寸价值")} value={amount(principal)} />
        <MetricCard label={t("活跃头寸")} value={active} />
        <MetricCard
          label={t("我的质押")}
          value={rows.filter((r) => r.staked > 0n).length}
        />
      </div>
      <div className="portfolio-claimable card">
        <strong>{t("可领取奖励")}</strong>
        <div className="portfolio-reward-list">
          {t(
            rows
              .filter((r) => BigInt(r.member?.claimable ?? "0") > 0n)
              .map((r) => (
                <div key={r.key}>
                  <EconomyLink p={r.p} tab="rewards" />
                  <strong>
                    {amount(BigInt(r.member?.claimable ?? "0"), r.p.symbol)}
                  </strong>
                </div>
              )),
          )}
          {t(
            !rows.some((r) => BigInt(r.member?.claimable ?? "0") > 0n) && (
              <span>{t("暂无可领取奖励")}</span>
            ),
          )}
        </div>
      </div>
      <ProductTabs
        label={t("个人资产分类")}
        items={[
          { value: "overview", label: "总览" },
          { value: "economies", label: "Projects" },
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
        {t(
          tab === "activity" ? (
            <DetailCard title={t("我的活动")}>
              <div className="filter-row">
                <Select
                  label={t("活动项目筛选")}
                  value={projectFilter}
                  onChange={setProjectFilter}
                  options={[
                    { value: "all", label: "全部项目" },
                    ...rows.map((r) => ({
                      value: r.key,
                      label: `${r.p.name} · ${r.p.projectId}`,
                    })),
                  ]}
                />
                <Select
                  label={t("活动类型筛选")}
                  value={actionFilter}
                  onChange={setActionFilter}
                  options={[
                    { value: "all", label: "全部操作" },
                    ...userActionTypes.map((t) => ({
                      value: t,
                      label: actionLabels[t],
                    })),
                  ]}
                />
              </div>
              <OutcomeEvents events={myEvents} />
            </DetailCard>
          ) : !rows.length ? (
            <EmptyState
              title={t("开始你的协议参与")}
              description={t(
                "买入曲线代币或参与运行中的项目后，你的资产与权益会同步到这里。",
              )}
            />
          ) : (
            <>
              {t(
                tab === "overview" && (
                  <div className="overview-grid">
                    <DetailCard title={t("钱包余额")}>
                      <KeyValueList
                        items={[
                          {
                            label: "USDT · BSC",
                            value: amount(BigInt(balances["56:usdt"] ?? "0")),
                          },
                          {
                            label: "总质押价值",
                            value: rows.every(
                              (r) => r.stakeValue !== null || r.staked === 0n,
                            )
                              ? amount(
                                  rows.reduce(
                                    (n, r) => n + (r.stakeValue ?? 0n),
                                    0n,
                                  ),
                                )
                              : "N/A · 部分项目价格不可用",
                          },
                        ]}
                      />
                    </DetailCard>
                    <DetailCard title={t("权益总览")}>
                      <p>
                        {t(
                          "可领取奖励、累计已结算奖励和贡献值按项目展示；不同代币的数量不相加。",
                        )}
                      </p>
                      <p className="small-note">
                        {t("参与资金不可赎回；生命周期容量不代表保证收益。")}
                      </p>
                    </DetailCard>
                  </div>
                ),
              )}
              {t(
                (tab === "positions" || tab === "rewards") && (
                  <div className="filter-row">
                    <Select
                      label={t(
                        tab === "positions" ? "头寸状态筛选" : "奖励状态筛选",
                      )}
                      value={status}
                      onChange={setStatus}
                      options={
                        tab === "positions"
                          ? [
                              { value: "all", label: "全部头寸" },
                              { value: "ACTIVE", label: "活跃" },
                              { value: "COMPLETED", label: "已完成" },
                            ]
                          : [
                              { value: "all", label: "全部权益" },
                              { value: "claimable", label: "可领取" },
                              { value: "claimed", label: "已领取" },
                            ]
                      }
                    />
                  </div>
                ),
              )}
              {t(
                !filtered.length ? (
                  <EmptyState description={t("此筛选下暂无记录。")} />
                ) : (
                  <div className="personal-projects">
                    {t(
                      filtered.map((r) => {
                        const { p, member: m, book: b } = r;
                        return (
                          <DetailCard
                            key={r.key}
                            title={t(`${p.name} · ${p.symbol}`)}
                          >
                            <div className="section-heading">
                              <EconomyLink
                                p={p}
                                tab={
                                  tab === "stakes"
                                    ? "stake"
                                    : tab === "rewards"
                                      ? "rewards"
                                      : tab === "contribution"
                                        ? "contribution"
                                        : undefined
                                }
                              />
                              <LifecycleBadge state={p.lifecycle} />
                            </div>
                            {t(
                              tab === "positions" ? (
                                <>
                                  {t(
                                    (m?.lots ?? [])
                                      .filter(
                                        (l) =>
                                          status === "all" ||
                                          l.status === status,
                                      )
                                      .map((l) => (
                                        <details
                                          className="personal-lot"
                                          key={l.id}
                                        >
                                          <summary>
                                            {t("头寸")}{" "}
                                            {l.id.replace(/^DEMO-LOT-/, "")} ·
                                            {t(" ")}
                                            {t(
                                              l.status === "ACTIVE"
                                                ? "活跃"
                                                : "已完成",
                                            )}
                                          </summary>
                                          <KeyValueList
                                            items={[
                                              {
                                                label: "参与资金",
                                                value: amount(
                                                  BigInt(l.principal),
                                                ),
                                              },
                                              {
                                                label: "生命周期容量",
                                                value: amount(
                                                  BigInt(l.capacity),
                                                ),
                                              },
                                              {
                                                label: "已使用",
                                                value: amount(BigInt(l.used)),
                                              },
                                              {
                                                label: "剩余",
                                                value: amount(
                                                  BigInt(l.capacity) -
                                                    BigInt(l.used),
                                                ),
                                              },
                                              {
                                                label: "创建时间",
                                                value: date(l.createdAt),
                                              },
                                              {
                                                label: "完成时间",
                                                value: date(l.completedAt),
                                              },
                                            ]}
                                          />
                                        </details>
                                      )),
                                  )}
                                  {t(
                                    !(m?.lots ?? []).some(
                                      (l) =>
                                        status === "all" || l.status === status,
                                    ) && (
                                      <EmptyState
                                        description={t(
                                          "此项目没有符合筛选的头寸。",
                                        )}
                                      />
                                    ),
                                  )}
                                </>
                              ) : tab === "stakes" ? (
                                <KeyValueList
                                  items={[
                                    {
                                      label: "我的质押",
                                      value: amount(r.staked, p.symbol),
                                    },
                                    {
                                      label: "质押价值",
                                      value:
                                        r.stakeValue === null
                                          ? "N/A"
                                          : amount(r.stakeValue),
                                    },
                                    {
                                      label: "覆盖率",
                                      value:
                                        r.coverage === null
                                          ? "N/A"
                                          : `${displayAmount(r.coverage * 100n, 2)}%`,
                                    },
                                    {
                                      label: "当前档位",
                                      value:
                                        r.tier.index === null
                                          ? "N/A"
                                          : [
                                              "未达覆盖",
                                              "基础覆盖",
                                              "增强覆盖",
                                              "高覆盖",
                                              "完整覆盖",
                                            ][r.tier.index],
                                    },
                                    {
                                      label: "活跃头寸价值",
                                      value: amount(r.principal),
                                    },
                                    {
                                      label: "状态",
                                      value:
                                        r.staked > 0n ? "已质押" : "未质押",
                                    },
                                  ]}
                                />
                              ) : tab === "rewards" ? (
                                <>
                                  <KeyValueList
                                    items={[
                                      {
                                        label: "昨日已结算",
                                        value: amount(r.yesterday, p.symbol),
                                      },
                                      {
                                        label: "可领取",
                                        value: amount(
                                          BigInt(m?.claimable ?? "0"),
                                          p.symbol,
                                        ),
                                      },
                                      {
                                        label: "累计毛收益",
                                        value: amount(
                                          BigInt(m?.lifetimeEarned ?? "0"),
                                          p.symbol,
                                        ),
                                      },
                                      {
                                        label: "累计毛领取",
                                        value: amount(
                                          BigInt(m?.lifetimeClaimed ?? "0"),
                                          p.symbol,
                                        ),
                                      },
                                      {
                                        label: "容量剩余",
                                        value: amount(r.remaining),
                                      },
                                    ]}
                                  />
                                  <details>
                                    <summary>{t("历史结算")}</summary>
                                    {t(
                                      b?.settlements.length ? (
                                        <DataTable
                                          caption={t("我的结算历史")}
                                          columns={["结算日", "已结算", "状态"]}
                                          rows={[...b.settlements]
                                            .reverse()
                                            .map((d) => [
                                              d.day,
                                              amount(
                                                BigInt(
                                                  d.members[user.wallet]
                                                    ?.gross ?? "0",
                                                ),
                                                p.symbol,
                                              ),
                                              d.status === "FINALIZED"
                                                ? "已结算"
                                                : "未生成奖励",
                                            ])}
                                        />
                                      ) : (
                                        <EmptyState
                                          description={t("暂无结算记录。")}
                                        />
                                      ),
                                    )}
                                  </details>
                                  <details>
                                    <summary>{t("领取历史")}</summary>
                                    {t(
                                      b?.claims.some(
                                        (c) => c.wallet === user.wallet,
                                      ) ? (
                                        <DataTable
                                          caption={t("我的领取历史")}
                                          columns={[
                                            "时间",
                                            "毛领取",
                                            "实际到账",
                                          ]}
                                          rows={b.claims
                                            .filter(
                                              (c) => c.wallet === user.wallet,
                                            )
                                            .map((c) => [
                                              date(c.timestamp),
                                              amount(BigInt(c.gross), p.symbol),
                                              amount(
                                                BigInt(c.received),
                                                p.symbol,
                                              ),
                                            ])}
                                        />
                                      ) : (
                                        <EmptyState
                                          description={t("暂无领取记录。")}
                                        />
                                      ),
                                    )}
                                  </details>
                                </>
                              ) : tab === "contribution" ? (
                                <KeyValueList
                                  items={[
                                    {
                                      label: "贡献值",
                                      value:
                                        b && validNetwork(r)
                                          ? displayAmount(
                                              r.network?.value ?? 0n,
                                            )
                                          : "N/A",
                                    },
                                    {
                                      label: "网络权重",
                                      value:
                                        b && validNetwork(r)
                                          ? `${displayAmount((r.network?.weight ?? 0n) * 100n, 2)}%`
                                          : "N/A",
                                    },
                                    {
                                      label: "有效网络",
                                      value: r.network?.activeNetwork ?? 0,
                                    },
                                    {
                                      label: "网络奖励",
                                      value: amount(
                                        BigInt(m?.networkEarned ?? "0"),
                                        p.symbol,
                                      ),
                                    },
                                  ]}
                                />
                              ) : (
                                <KeyValueList
                                  items={[
                                    { label: "项目 ID", value: p.projectId },
                                    {
                                      label: "合约地址",
                                      value: (
                                        <ContractAddress
                                          address={p.tokenContract}
                                        />
                                      ),
                                    },
                                    {
                                      label:
                                        p.lifecycle === "CURVE_OPEN"
                                          ? "曲线持仓"
                                          : "钱包代币",
                                      value: amount(r.balance, p.symbol),
                                    },
                                    {
                                      label: "活跃头寸价值",
                                      value: amount(r.principal),
                                    },
                                    {
                                      label: "我的质押",
                                      value: amount(r.staked, p.symbol),
                                    },
                                    {
                                      label: "可领取",
                                      value: amount(
                                        BigInt(m?.claimable ?? "0"),
                                        p.symbol,
                                      ),
                                    },
                                    ...(tab === "overview"
                                      ? [
                                          {
                                            label: "累计已结算",
                                            value: amount(
                                              BigInt(m?.lifetimeEarned ?? "0"),
                                              p.symbol,
                                            ),
                                          },
                                          {
                                            label: "贡献值",
                                            value: validNetwork(r)
                                              ? displayAmount(
                                                  r.network?.value ?? 0n,
                                                )
                                              : "N/A",
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                              ),
                            )}
                          </DetailCard>
                        );
                      }),
                    )}
                  </div>
                ),
              )}
            </>
          ),
        )}
      </ProductTabs>
    </div>
  );
}
function validNetwork(r: ReturnType<typeof personalRows>[number]) {
  return (
    r.book &&
    r.book.prices.status !== "PRICE_INVALID" &&
    r.book.prices.status !== "PRICE_DISCOVERY"
  );
}
