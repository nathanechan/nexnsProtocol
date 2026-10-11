"use client";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import { projectKey, projectRoute } from "../domain/identity";
import { price, percent } from "../product/format";
import {
  ContractAddress,
  DetailCard,
  EmptyState,
  KeyValueList,
  LifecycleBadge,
  PageHeader,
  PriceStatusBadge,
} from "./ui";
import { EconomyLink, LiquidityResults } from "./result-views";
import { supplyResult } from "../product/read-model";
import { displayAmount } from "../domain/economics/amount";
import Link from "next/link";
export function PEcosystem() {
  const { t } = useLocale();

  const projects = useSimulation((s) => s.projects);
  const books = useSimulation((s) => s.operatingBooks);
  const p = Object.values(projects).find((p) => p.isPlatformToken);
  return (
    <>
      <PageHeader
        eyebrow={t("NEXNS")}
        title={t("NEXNS")}
        description={t("NEXNS 平台代币与协议项目的公开连接。")}
      />
      {t(
        !p ? (
          <EmptyState
            title={t("平台代币暂不可用")}
            description={t("平台代币信息暂不可用。")}
          />
        ) : (
          <>
            <div className="overview-grid">
              <DetailCard title={t("NEXNS 代币")}>
                <div className="inline">
                  <LifecycleBadge state={p.lifecycle} />
                  <PriceStatusBadge status={p.priceStatus} />
                </div>
                <KeyValueList
                  items={[
                    {
                      label: "当前总供应",
                      value: `${displayAmount(supplyResult({ operatingBooks: books }, p).total)} NEXNS`,
                    },
                    { label: "交易对", value: "NEXNS/USDT" },
                    { label: "项目 ID", value: p.projectId },
                    {
                      label: "合约地址",
                      value: <ContractAddress address={p.tokenContract} />,
                    },
                    { label: "网络", value: `BSC · ${p.chainId}` },
                    {
                      label: "当前状态",
                      value:
                        p.lifecycle === "CURVE_OPEN"
                          ? `曲线进度 ${percent(p.curve.progress)}`
                          : p.lifecycle === "OPERATING"
                            ? "项目运行中"
                            : "流动性迁移中",
                    },
                    {
                      label: "参考价",
                      value:
                        p.lifecycle === "CURVE_OPEN"
                          ? `${price(p.curve.curvePrice)}`
                          : p.lifecycle === "OPERATING" &&
                              ["VALID", "PROTECTED"].includes(p.priceStatus)
                            ? `${price(p.operating?.tokenPrice)}`
                            : "N/A",
                    },
                  ]}
                />
                <Link className="button primary" href={projectRoute(p)}>
                  {t("进入 NEXNS 项目 ↗")}
                </Link>
              </DetailCard>
              <DetailCard title={t("生态角色")}>
                <p>
                  {t(
                    "NEXNS 平台代币遵循与普通项目相同的曲线发行和奖励规则。其交易池使用 NEXNS / USDT。",
                  )}
                </p>
                <p>{t("普通项目可通过项目代币 / NEXNS 交易池连接NEXNS。")}</p>
              </DetailCard>
              <LiquidityResults p={p} />
            </div>
            <DetailCard title={t("已建立生态连接")}>
              {t(
                Object.values(projects)
                  .filter(
                    (q) =>
                      projectKey(q.chainId, q.tokenContract) !==
                        projectKey(p.chainId, p.tokenContract) &&
                      q.migration.resultingPools.some(
                        (pool) => pool.pair === "X/NEXUS",
                      ),
                  )
                  .map((q) => (
                    <div className="ecosystem-row" key={q.projectId}>
                      <EconomyLink p={q} />
                      <LifecycleBadge state={q.lifecycle} />
                      <ContractAddress address={q.tokenContract} />
                    </div>
                  )),
              )}
            </DetailCard>
          </>
        ),
      )}
    </>
  );
}
