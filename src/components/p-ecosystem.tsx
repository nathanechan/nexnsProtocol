"use client";
import { ProjectLogo } from "./project-logo";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import { projectKey } from "../domain/identity";
import { price, money } from "../product/format";
import {
  ContractAddress,
  DetailCard,
  EmptyState,
  KeyValueList,
  LifecycleBadge,
  PageHeader,
  PriceStatusBadge,
} from "./ui";
import { EconomyLink } from "./result-views";
import { supplyResult } from "../product/read-model";
import { displayAmount } from "../domain/economics/amount";
export function PEcosystem() {
  const { t } = useLocale();

  const projects = useSimulation((s) => s.projects);
  const books = useSimulation((s) => s.operatingBooks);
  const p = Object.values(projects).find((p) => p.isPlatformToken);
  const connections = Object.values(projects).filter(
    (q) =>
      p &&
      projectKey(q.chainId, q.tokenContract) !==
        projectKey(p.chainId, p.tokenContract) &&
      q.migration.resultingPools.some((pool) => pool.pair === "X/NEXUS"),
  );
  return (
    <div className="secondary-page core-asset-page" data-nexns-ui="v2">
      <PageHeader
        eyebrow={t("NEXNS")}
        title={t("NEXNS")}
        description={t("NEXNS 核心资产与生态概览。")}
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
                  <span className="project-logo">
                    <ProjectLogo
                      logo={p.logo}
                      identity={`${p.chainId}:${p.tokenContract}`}
                      platform
                    />
                  </span>
                  <LifecycleBadge state={p.lifecycle} />
                  {p.priceStatus !== "VALID" && (
                    <PriceStatusBadge status={p.priceStatus} />
                  )}
                </div>
                <KeyValueList
                  items={[
                    {
                      label: "当前总供应",
                      value: `${displayAmount(supplyResult({ operatingBooks: books }, p).total)} NEXNS`,
                    },
                    {
                      label: "已销毁",
                      value: `${displayAmount(supplyResult({ operatingBooks: books }, p).burned)} NEXNS`,
                    },
                    {
                      label: "总流动性",
                      value: p.operating
                        ? money(p.operating.liquidity)
                        : "尚未建立",
                    },
                    { label: "交易对", value: "NEXNS/USDT" },
                    { label: "项目 ID", value: p.projectId },
                    {
                      label: "合约地址",
                      value: <ContractAddress address={p.tokenContract} />,
                    },
                    { label: "网络", value: `BSC · ${p.chainId}` },
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
              </DetailCard>
              <DetailCard title={t("关于 NEXNS")}>
                <p>
                  {t(
                    "NEXNS 是平台的核心代币，连接项目发行、协议参与与生态流动性。",
                  )}
                </p>
                <p>
                  {t("在此查看 NEXNS 的供应、销毁、流动性及已建立的项目连接。")}
                </p>
              </DetailCard>
            </div>
            <DetailCard title={t("已建立生态连接")}>
              {!connections.length && (
                <EmptyState title={t("暂无生态连接")} description="" />
              )}
              {t(
                connections.map((q) => (
                  <div className="ecosystem-row" key={q.projectId}>
                    <EconomyLink p={q} />
                    <ContractAddress address={q.tokenContract} />
                  </div>
                )),
              )}
            </DetailCard>
          </>
        ),
      )}
    </div>
  );
}
