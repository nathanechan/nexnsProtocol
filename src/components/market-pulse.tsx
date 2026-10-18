"use client";
import Link from "next/link";
import type { Activity } from "../domain/models";
import type { MarketRow } from "../data/market";
import { useLocale } from "../i18n/locale";
import { AnimatedAmount } from "./animated-amount";
import { ProjectLogo } from "./project-logo";
import { Flame, TrendingUp, Clock3, Radio } from "lucide-react";
import { curvePercent } from "../product/format";
import { marketChange, compactMarketNumber } from "../product/market-format";

export function MarketPulse({
  rows,
  activities,
  launch,
  now,
  histories = {},
}: {
  rows: MarketRow[];
  activities: Activity[];
  launch: boolean;
  now?: number;
  histories?: Record<string, number[]>;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const sorted = (metric: (r: MarketRow) => number) =>
    [...rows].sort(
      (a, b) => metric(b) - metric(a) || a.key.localeCompare(b.key),
    );
  const cards = launch
    ? [
        {
          label: en ? "Near completion" : "临近完成",
          icon: Flame,
          row: sorted((r) => r.progress ?? -1)[0],
          metric: "progress",
        },
        {
          label: en ? "Active trading" : "成交活跃",
          icon: TrendingUp,
          row: sorted((r) => r.volume ?? -1)[0],
          metric: "volume",
        },
        {
          label: en ? "Just launched" : "最新发行",
          icon: Clock3,
          row: sorted((r) => Date.parse(r.createdAt) || 0)[0],
          metric: "price",
        },
      ]
    : [
        {
          label: en ? "Active trading" : "成交活跃",
          icon: Flame,
          row: sorted((r) => r.volume ?? -1)[0],
          metric: "volume",
        },
        {
          label: en ? "Price movement" : "价格异动",
          icon: TrendingUp,
          row: sorted((r) => Math.abs(r.change ?? 0))[0],
          metric: "change",
        },
        {
          label: en ? "Recently live" : "新进入运行",
          icon: Clock3,
          row: sorted((r) => Date.parse(r.operatingAt ?? r.createdAt) || 0)[0],
          metric: "price",
        },
      ];
  const projects = new Map(rows.map((r) => [r.key, r]));
  const events = [...activities]
    .filter(
      (a) =>
        projects.has(a.projectKey) &&
        (now == null ||
          (Date.parse(a.timestamp) <= now &&
            Date.parse(a.timestamp) >= now - 86_400_000)) &&
        ["BUY", "SELL", "PARTICIPATE", "STAKE", "UNSTAKE", "CLAIM"].includes(
          a.type,
        ),
    )
    .sort(
      (a, b) =>
        Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4);
  const labels: Record<string, string> = en
    ? {
        BUY: "Buy",
        SELL: "Sell",
        PARTICIPATE: "Participate",
        STAKE: "Stake",
        UNSTAKE: "Unstake",
        CLAIM: "Claim",
      }
    : {
        BUY: "买入",
        SELL: "卖出",
        PARTICIPATE: "参与",
        STAKE: "质押",
        UNSTAKE: "解除质押",
        CLAIM: "领取",
      };
  return (
    <div className="market-pulse">
      <div
        className="market-tape"
        aria-label={en ? "Recent activity" : "最新活动"}
      >
        <span className="tape-label">
          <Radio size={13} />
          {en ? "Latest activity" : "最新活动"}
        </span>
        {events.length ? (
          events.map((a) => {
            const row = projects.get(a.projectKey)!;
            const amount = Number(a.displayValues.amount);
            return (
              <Link
                className={`tape-event ${a.type === "SELL" || a.type === "UNSTAKE" ? "outflow" : "inflow"}`}
                href={row.href}
                key={a.id}
                data-event-id={a.id}
              >
                <span className="pulse-logo">
                  <ProjectLogo
                    logo={row.logo}
                    identity={row.key}
                    platform={row.platform}
                  />
                </span>
                {now != null && (
                  <time dateTime={a.timestamp}>
                    {now - Date.parse(a.timestamp) < 60_000
                      ? en
                        ? "just now"
                        : "刚刚"
                      : en
                        ? `${Math.floor((now - Date.parse(a.timestamp)) / 60_000)}m ago`
                        : `${Math.floor((now - Date.parse(a.timestamp)) / 60_000)} 分钟前`}
                  </time>
                )}
                <strong data-user-text>{row.symbol}</strong>
                <span>
                  {labels[a.type]}
                  {Number.isFinite(amount) && amount > 0
                    ? ` ${compactMarketNumber(amount)} ${a.displayValues.paidAsset ?? (a.type === "PARTICIPATE" || a.type === "BUY" ? "USDT" : row.symbol)}`
                    : ""}
                </span>
              </Link>
            );
          })
        ) : (
          <span className="tape-empty">
            {en ? "No activity yet" : "暂无活动"}
          </span>
        )}
      </div>
      <div className="market-focus">
        {cards.map(({ row, label, icon: Icon, metric }, index) =>
          row ? (
            <Link className="market-focus-card" href={row.href} key={index}>
              {(histories[row.key]?.length ?? 0) > 1 && (
                <svg
                  className="focus-spark"
                  viewBox="0 0 120 32"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    points={histories[row.key]
                      .map(
                        (v, i, values) =>
                          `${(i * 120) / (values.length - 1)},${28 - ((v - Math.min(...values)) / (Math.max(...values) - Math.min(...values) || 1)) * 24}`,
                      )
                      .join(" ")}
                  />
                </svg>
              )}
              <span className="focus-label">
                <Icon size={13} />
                {label}
              </span>
              <span className="focus-identity">
                <span className="pulse-logo">
                  <ProjectLogo
                    logo={row.logo}
                    identity={row.key}
                    platform={row.platform}
                  />
                </span>
                <strong data-user-text>{row.symbol}</strong>
              </span>
              <span
                className={`focus-value ${metric === "change" ? (row.change != null && row.change < 0 ? "negative" : row.change != null && row.change > 0 ? "positive" : "") : ""}`}
              >
                {metric === "progress" ? (
                  curvePercent(row.progress)
                ) : metric === "change" ? (
                  row.change == null ? (
                    "—"
                  ) : (
                    marketChange(row.change)
                  )
                ) : metric === "volume" ? (
                  row.volume == null ? (
                    "—"
                  ) : (
                    <AnimatedAmount value={row.volume} currency />
                  )
                ) : row.price == null ? (
                  "—"
                ) : (
                  <AnimatedAmount value={row.price} price />
                )}
              </span>
              <small>
                {metric === "volume"
                  ? en
                    ? "24h volume"
                    : "24h 成交量"
                  : metric === "progress"
                    ? en
                      ? "Issuance progress"
                      : "发行进度"
                    : metric === "change"
                      ? "24h"
                      : "USDT"}
              </small>
              {metric === "progress" && (
                <span className="focus-progress">
                  <i
                    style={{
                      width: `${Math.min(100, Math.max(0, (row.progress ?? 0) * 100))}%`,
                    }}
                  />
                </span>
              )}
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}
