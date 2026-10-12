"use client";
import { useMemo, useState } from "react";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import { projectKey } from "../domain/identity";
import { displayAmount } from "../domain/economics/amount";
import { supplyResult, publicOutcomes } from "../product/read-model";
import { projectName } from "../product/metadata";
import { date, money, price } from "../product/format";
import {
  ContractAddress,
  PageHeader,
  LifecycleBadge,
  PriceStatusBadge,
  Select,
} from "./ui";
import { ProductTabs } from "./product-tabs";
import { EconomyLink, OutcomeEvents } from "./result-views";
import { CompactResults, SummaryStrip } from "./compact-results";
const modules = [
  { value: "overview", label: "总览" },
  { value: "contracts", label: "合约" },
  { value: "supply", label: "供应" },
  { value: "settlement", label: "结算" },
  { value: "price", label: "价格状态" },
  { value: "events", label: "公开事件" },
];
export function ProtocolPage() {
  const { t, locale } = useLocale();
  const projectMap = useSimulation((s) => s.projects),
    books = useSimulation((s) => s.operatingBooks),
    activities = useSimulation((s) => s.activities);
  const projects = useMemo(() => Object.values(projectMap), [projectMap]);
  const [tab, setTab] = useState("overview"),
    [selected, setSelected] = useState(""),
    [page, setPage] = useState(0);
  const p = projectMap[selected as keyof typeof projectMap] ?? projects[0],
    key = p ? projectKey(p.chainId, p.tokenContract) : null,
    b = key ? books[key] : undefined;
  const last = Object.values(books)
    .flatMap((b) =>
      b.settlements.map((d) => ({ ...d, project: b.projectIdentity })),
    )
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const pol = projects.reduce((n, p) => n + (p.operating?.polValue ?? 0), 0);
  const events = publicOutcomes({
    projects: projectMap,
    operatingBooks: books,
    activities,
  });
  const current = projects.slice(page * 12, (page + 1) * 12);
  const projectSelect = (
    <div className="filter-row">
      <Select
        label={t("透明度项目")}
        value={key ?? ""}
        onChange={setSelected}
        options={projects.map((p) => ({
          value: projectKey(p.chainId, p.tokenContract),
          label: `${projectName(p, locale)} · ${p.symbol} · ${p.projectId}`,
        }))}
      />
      {p && <EconomyLink p={p} />}
    </div>
  );
  const supplyRows = (items: typeof projects) =>
    items.map((p) => {
      const s = supplyResult({ operatingBooks: books }, p);
      return [
        <EconomyLink key={p.projectId} p={p} />,
        `${displayAmount(s.genesis)} ${p.symbol}`,
        `${displayAmount(s.minted)} ${p.symbol}`,
        `${displayAmount(s.burned)} ${p.symbol}`,
        `${displayAmount(s.total)} ${p.symbol}`,
        `${displayAmount(s.remaining)} ${p.symbol}`,
      ];
    });
  const pagination = (
    <div className="pagination">
      <button
        className="button secondary"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        {t("上一页")}
      </button>
      <span>
        {page + 1} / {Math.max(1, Math.ceil(projects.length / 12))}
      </span>
      <button
        className="button secondary"
        disabled={(page + 1) * 12 >= projects.length}
        onClick={() => setPage(page + 1)}
      >
        {t("下一页")}
      </button>
    </div>
  );
  return (
    <div className="secondary-page protocol-page">
      <PageHeader
        eyebrow={t("PROTOCOL TRANSPARENCY")}
        title={t("协议透明度")}
        description={t("项目身份、供应、结算与流动性的公开结果。")}
      />
      <div className="network-context">
        <span>BSC · 56</span>
        <small>
          {t("最近结算")} · {date(last[0]?.completedAt ?? null)}
        </small>
      </div>
      <ProductTabs
        label={t("协议透明度模块")}
        items={modules}
        value={tab}
        onChange={setTab}
      >
        {tab === "overview" ? (
          <>
            <SummaryStrip
              items={[
                { label: "项目总数", value: projects.length },
                { label: "总 POL 价值", value: money(pol) },
                { label: "供应与销毁", value: t("按项目查看") },
                {
                  label: "已结算项目",
                  value: new Set(last.map((d) => d.project)).size,
                },
                {
                  label: "状态",
                  value: t(last.length ? "已结算" : "尚无结算"),
                },
              ]}
            />
            {projectSelect}
            <CompactResults
              caption={t("供应口径")}
              columns={[
                "项目",
                "创世供应",
                "累计发行",
                "已销毁",
                "当前供应",
                "剩余发行容量",
              ]}
              rows={p ? supplyRows([p]) : []}
            />
            <section className="secondary-events">
              <h2>{t("最近公开结果")}</h2>
              <OutcomeEvents events={events.slice(0, 6)} />
            </section>
          </>
        ) : tab === "contracts" ? (
          <>
            <CompactResults
              caption={t("项目合约注册表")}
              columns={["项目 / 注册 ID", "链", "代币合约", "状态", "池地址"]}
              rows={current.map((p) => [
                <span key={p.projectId}>
                  <EconomyLink p={p} />
                  <small>{p.projectId}</small>
                </span>,
                `BSC · ${p.chainId}`,
                <ContractAddress
                  key={p.tokenContract}
                  address={p.tokenContract}
                />,
                <LifecycleBadge key="stage" state={p.lifecycle} />,
                "N/A",
              ])}
            />
            {pagination}
          </>
        ) : tab === "supply" ? (
          <>
            {projectSelect}
            <CompactResults
              caption={t("供应结果")}
              columns={[
                "项目",
                "创世供应",
                "累计发行",
                "已销毁",
                "当前供应",
                "剩余发行容量",
              ]}
              rows={p ? supplyRows([p]) : []}
            />
          </>
        ) : tab === "settlement" ? (
          <>
            {projectSelect}
            <SummaryStrip
              items={[
                {
                  label: "最近结算",
                  value: date(b?.settlements.at(-1)?.completedAt ?? null),
                },
                {
                  label: "状态",
                  value: t(
                    b?.settlements.length
                      ? b.settlements.at(-1)?.status === "FINALIZED"
                        ? "已结算"
                        : "未生成奖励"
                      : "尚无结算",
                  ),
                },
                {
                  label: "最近已结算奖励",
                  value: b?.settlements.length
                    ? `${displayAmount(BigInt(b.settlements.at(-1)!.gross))} ${p.symbol}`
                    : "N/A",
                },
              ]}
            />
            <CompactResults
              caption={t("结算结果")}
              columns={["结算日", "已结算", "状态", "时间"]}
              rows={[...(b?.settlements ?? [])]
                .reverse()
                .map((d) => [
                  d.day,
                  `${displayAmount(BigInt(d.gross))} ${p.symbol}`,
                  t(d.status === "FINALIZED" ? "已结算" : "未生成奖励"),
                  date(d.completedAt),
                ])}
            />
          </>
        ) : tab === "price" ? (
          <>
            <SummaryStrip
              items={[
                {
                  label: "价格有效",
                  value: projects.filter((p) => p.priceStatus === "VALID")
                    .length,
                },
                {
                  label: "价格保护",
                  value: projects.filter((p) => p.priceStatus === "PROTECTED")
                    .length,
                },
                {
                  label: "价格无效",
                  value: projects.filter(
                    (p) => p.priceStatus === "PRICE_INVALID",
                  ).length,
                },
                {
                  label: "价格建立中",
                  value: projects.filter(
                    (p) => p.priceStatus === "PRICE_DISCOVERY",
                  ).length,
                },
              ]}
            />
            <CompactResults
              caption={t("项目价格质量")}
              columns={[
                "项目",
                "阶段",
                "价格状态",
                "有效参考价 · USDT",
                "最近更新",
              ]}
              rows={current.map((p) => [
                <EconomyLink key={p.projectId} p={p} />,
                <LifecycleBadge key="stage" state={p.lifecycle} />,
                <PriceStatusBadge key="price" status={p.priceStatus} />,
                p.lifecycle === "CURVE_OPEN"
                  ? price(p.curve.curvePrice)
                  : p.lifecycle === "OPERATING" &&
                      ["VALID", "PROTECTED"].includes(p.priceStatus)
                    ? price(p.operating?.tokenPrice)
                    : "N/A",
                date(p.updatedAt ?? p.createdAt),
              ])}
            />
            {pagination}
          </>
        ) : (
          <section className="secondary-events">
            <h2>{t("公开协议事件")}</h2>
            <OutcomeEvents events={events} />
          </section>
        )}
      </ProductTabs>
    </div>
  );
}
