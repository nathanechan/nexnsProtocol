"use client";
import { useLocale } from "../i18n/locale";
import { useMemo, useState } from "react";
import { useSimulation } from "../simulation/store";
import { projectKey } from "../domain/identity";
import { displayAmount } from "../domain/economics/amount";
import {
  supplyResult,
  publicOutcomes,
  publicResultTrend,
} from "../product/read-model";
import { date, money, price } from "../product/format";
import {
  ContractAddress,
  DataTable,
  DetailCard,
  EmptyState,
  KeyValueList,
  LifecycleBadge,
  MetricCard,
  PageHeader,
  PriceStatusBadge,
  Select,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import {
  EconomyLink,
  LiquidityResults,
  OutcomeEvents,
  RegistryTable,
  ResultTrend,
} from "./result-views";
const modules = [
  { value: "overview", label: "总览" },
  { value: "network", label: "网络状态" },
  { value: "supply", label: "供应" },
  { value: "contracts", label: "合约" },
  { value: "settlement", label: "结算" },
  { value: "price", label: "价格状态" },
  { value: "pol", label: "协议流动性" },
  { value: "burn", label: "销毁" },
  { value: "events", label: "公开事件" },
];
export function ProtocolPage() {
  const { t } = useLocale();

  const projectMap = useSimulation((s) => s.projects),
    books = useSimulation((s) => s.operatingBooks),
    activities = useSimulation((s) => s.activities);
  const projects = useMemo(() => Object.values(projectMap), [projectMap]);
  const [tab, setTab] = useState("overview"),
    [selected, setSelected] = useState(""),
    [page, setPage] = useState(0);
  const p = projectMap[selected as keyof typeof projectMap] ?? projects[0];
  const key = p ? projectKey(p.chainId, p.tokenContract) : null,
    b = key ? books[key] : null;
  const supply = p ? supplyResult({ operatingBooks: books }, p) : null;
  const last = Object.values(books)
    .flatMap((b) =>
      b.settlements.map((d) => ({ ...d, project: b.projectIdentity })),
    )
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const pol = projects.reduce((n, p) => n + (p.operating?.polValue ?? 0), 0),
    liquidity = projects.reduce((n, p) => n + (p.operating?.liquidity ?? 0), 0);
  const updated =
    projects
      .map((p) => p.updatedAt ?? p.createdAt)
      .sort()
      .at(-1) ?? null;
  const events = publicOutcomes({
    projects: projectMap,
    operatingBooks: books,
    activities,
  });
  const projectSelect = (
    <div className="filter-row">
      <Select
        label={t("透明度项目")}
        value={key ?? ""}
        onChange={setSelected}
        options={projects.map((p) => ({
          value: projectKey(p.chainId, p.tokenContract),
          label: `${p.name} · ${p.symbol} · ${p.projectId}`,
        }))}
      />
      {t(p && <EconomyLink p={p} />)}
    </div>
  );
  return (
    <>
      <PageHeader
        eyebrow={t("PROTOCOL TRANSPARENCY")}
        title={t("协议透明度")}
        description={t("项目身份、供应、结算与流动性的公开结果。")}
      />
      <div className="network-context">
        <span>{t("BSC · 56")}</span>
        <small>
          {t("最近更新：")}
          {t(date(updated))}
        </small>
      </div>
      <ProductTabs
        label={t("协议透明度模块")}
        items={modules}
        value={tab}
        onChange={setTab}
      >
        {t(
          tab === "overview" ? (
            <>
              <div className="project-metrics">
                <MetricCard label={t("项目总数")} value={projects.length} />
                <MetricCard
                  label={t("曲线发行中")}
                  value={
                    projects.filter((p) => p.lifecycle === "CURVE_OPEN").length
                  }
                />
                <MetricCard
                  label={t("运行中")}
                  value={
                    projects.filter((p) => p.lifecycle === "OPERATING").length
                  }
                />
                <MetricCard label={t("总 POL 价值")} value={`${money(pol)}`} />
              </div>
              <div className="overview-grid">
                <DetailCard title={t("供应口径")}>
                  <p>
                    {t(
                      "每个项目独立发行、独立记账。不同项目代币不相加为一种网络资产。",
                    )}
                  </p>
                  <KeyValueList
                    items={[
                      { label: "供应与销毁", value: "按项目查看" },
                      { label: "总流动性", value: `${money(liquidity)}` },
                      {
                        label: "最近结算",
                        value: date(last[0]?.completedAt ?? null),
                      },
                      {
                        label: "已结算项目",
                        value: new Set(last.map((d) => d.project)).size,
                      },
                    ]}
                  />
                </DetailCard>
                <DetailCard title={t("最近公开结果")}>
                  <OutcomeEvents events={events.slice(0, 6)} />
                </DetailCard>
              </div>
            </>
          ) : tab === "network" ? (
            <DataTable
              caption={t("项目网络状态")}
              columns={["项目", "生命周期", "价格质量", "最近更新"]}
              rows={projects.map((p) => [
                <EconomyLink key={p.projectId} p={p} />,
                <LifecycleBadge key={p.lifecycle} state={p.lifecycle} />,
                <PriceStatusBadge key={p.priceStatus} status={p.priceStatus} />,
                date(p.updatedAt ?? p.createdAt),
              ])}
            />
          ) : tab === "contracts" ? (
            <>
              <RegistryTable
                projects={projects.slice(page * 12, (page + 1) * 12)}
              />
              <div className="pagination">
                <button
                  className="button secondary"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  {t("上一页")}
                </button>
                <span>
                  {t(page + 1)} /{" "}
                  {t(Math.max(1, Math.ceil(projects.length / 12)))}
                  {t(" ")}
                </span>
                <button
                  className="button secondary"
                  disabled={(page + 1) * 12 >= projects.length}
                  onClick={() => setPage(page + 1)}
                >
                  {t("下一页")}
                </button>
              </div>
            </>
          ) : tab === "price" ? (
            <>
              <DataTable
                caption={t("项目价格质量")}
                columns={[
                  "项目",
                  "阶段",
                  "价格状态",
                  "有效参考价 · USDT",
                  "最近更新",
                ]}
                rows={projects.map((p) => [
                  <EconomyLink key={p.projectId} p={p} />,
                  <LifecycleBadge key={p.lifecycle} state={p.lifecycle} />,
                  <PriceStatusBadge
                    key={p.priceStatus}
                    status={p.priceStatus}
                  />,
                  p.lifecycle === "CURVE_OPEN"
                    ? price(p.curve.curvePrice)
                    : p.lifecycle === "OPERATING" &&
                        ["VALID", "PROTECTED"].includes(p.priceStatus)
                      ? price(p.operating?.tokenPrice)
                      : "N/A",
                  date(p.updatedAt ?? p.createdAt),
                ])}
              />
            </>
          ) : tab === "events" ? (
            <DetailCard title={t("公开协议事件")}>
              <OutcomeEvents events={events} />
            </DetailCard>
          ) : (
            <>
              {t(projectSelect)}
              {t(
                !p || !supply ? (
                  <EmptyState description={t("当前没有项目数据。")} />
                ) : tab === "supply" ? (
                  <DetailCard title={t(`${p.symbol} · 供应结果`)}>
                    <KeyValueList
                      items={[
                        {
                          label: "创世供应",
                          value: `${displayAmount(supply.genesis)} ${p.symbol}`,
                        },
                        {
                          label: "累计发行",
                          value: `${displayAmount(supply.minted)} ${p.symbol}`,
                        },
                        {
                          label: "已销毁",
                          value: `${displayAmount(supply.burned)} ${p.symbol}`,
                        },
                        {
                          label: "当前供应",
                          value: `${displayAmount(supply.total)} ${p.symbol}`,
                        },
                        {
                          label: "剩余发行容量",
                          value: `${displayAmount(supply.remaining)} ${p.symbol}`,
                        },
                        {
                          label: "合约地址",
                          value: <ContractAddress address={p.tokenContract} />,
                        },
                      ]}
                    />
                  </DetailCard>
                ) : tab === "settlement" ? (
                  <>
                    <DetailCard title={t("结算结果")}>
                      <KeyValueList
                        items={[
                          {
                            label: "最近结算",
                            value: date(
                              b?.settlements.at(-1)?.completedAt ?? null,
                            ),
                          },
                          {
                            label: "状态",
                            value: b?.settlements.length
                              ? b.settlements.at(-1)?.status === "FINALIZED"
                                ? "已结算"
                                : "未生成奖励"
                              : "尚无结算",
                          },
                          {
                            label: "最近已结算奖励",
                            value: b?.settlements.length
                              ? `${displayAmount(BigInt(b.settlements.at(-1)!.gross))} ${p.symbol}`
                              : "N/A",
                          },
                          {
                            label: "全网络已结算项目",
                            value: new Set(last.map((d) => d.project)).size,
                          },
                          { label: "结算日期", value: b?.day ?? "N/A" },
                        ]}
                      />
                    </DetailCard>
                    <ResultTrend
                      title={t("已结算奖励历史")}
                      points={(b?.settlements ?? []).map((d) => ({
                        day: d.day,
                        value: BigInt(d.gross),
                      }))}
                      unit={p.symbol}
                    />
                  </>
                ) : tab === "pol" ? (
                  <div className="overview-grid">
                    <LiquidityResults p={p} />
                    <ResultTrend
                      title={t("POL 公开结果历史")}
                      points={publicResultTrend(b ?? undefined, "pol")}
                      unit="USDT"
                    />
                  </div>
                ) : (
                  <div className="overview-grid">
                    <DetailCard title={t("销毁结果")}>
                      <KeyValueList
                        items={[
                          {
                            label: "累计已销毁",
                            value: `${displayAmount(supply.burned)} ${p.symbol}`,
                          },
                          {
                            label: "累计新增销毁",
                            value: `${displayAmount(BigInt(b?.burned ?? "0"))} ${p.symbol}`,
                          },
                          {
                            label: "最近更新",
                            value: date(p.updatedAt ?? p.createdAt),
                          },
                        ]}
                      />
                    </DetailCard>
                    <ResultTrend
                      title={t("已销毁供应历史")}
                      points={publicResultTrend(b ?? undefined, "burned")}
                      unit={p.symbol}
                    />
                    <DetailCard title={t("相关公开结果")}>
                      <OutcomeEvents
                        events={events.filter(
                          (a) =>
                            a.projectKey === key &&
                            ["CLAIM", "SUPPLY_BURNED"].includes(a.type),
                        )}
                      />
                    </DetailCard>
                  </div>
                ),
              )}
            </>
          ),
        )}
      </ProductTabs>
    </>
  );
}
