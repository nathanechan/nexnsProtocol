"use client";
import { liveStakeHistory } from "../simulation/live-market";
import { AnimatedAmount } from "./animated-amount";
import { useId, useMemo, useState } from "react";
import type { Project } from "../domain/models";
import { useSimulation } from "../simulation/store";
import { useLocale } from "../i18n/locale";
import {
  stakingWindow,
  stakeRanges,
  type StakeRange,
  type StakePoint,
} from "../product/staking-history";
import { compactMarketNumber } from "../product/market-format";
export function StakeSparkline({ points }: { points: StakePoint[] }) {
  const sampled = points.filter(
    (_, i) => i % 15 === 0 || i === points.length - 1,
  );
  const min = Math.min(...sampled.map((p) => p.amount)),
    max = Math.max(...sampled.map((p) => p.amount));
  return (
    <svg className="stake-sparkline" viewBox="0 0 90 24" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={sampled
          .map(
            (p, i) =>
              `${(i / (sampled.length - 1)) * 90},${22 - ((p.amount - min) / (max - min || 1)) * 18}`,
          )
          .join(" ")}
      />
    </svg>
  );
}
export function StakingChart({ project }: { project: Project }) {
  const { locale } = useLocale();
  const activities = useSimulation((s) => s.activities);
  const live = useSimulation((s) => s.liveMarket);
  const [range, setRange] = useState<StakeRange>("7D"),
    [hover, setHover] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");
  const all = useMemo(
    () => liveStakeHistory(project, activities, live),
    [project, activities, live],
  );
  const points = stakingWindow(all, range);
  const max = Math.max(...points.map((p) => p.amount)) * 1.06 || 1;
  const min = Math.max(0, Math.min(...points.map((p) => p.amount)) * 0.94);
  const start = points[0].time,
    span = points.at(-1)!.time - start || 1;
  const x = (p: StakePoint) => 24 + ((p.time - start) / span) * 680;
  const y = (p: StakePoint) => 230 - ((p.amount - min) / (max - min)) * 190;
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${x(p)},${y(p)}`)
    .join(" ");
  const selected = points[hover ?? points.length - 1];
  const previous = hover != null && hover > 0 ? points[hover - 1] : points[0];
  const change = previous.amount
    ? (selected.amount / previous.amount - 1) * 100
    : null;
  const period = points[0].amount
    ? (points.at(-1)!.amount / points[0].amount - 1) * 100
    : null;
  const stamp = (time: number, full = false) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hourCycle: "h23",
      ...(full ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(time);
  return (
    <section
      className="staking-chart terminal-chart"
      aria-label={locale === "en" ? "Staking Trend" : "质押趋势"}
    >
      <div className="trend-heading">
        <div>
          <h2>{locale === "en" ? "Staking Trend" : "质押趋势"}</h2>
          <strong>
            <AnimatedAmount value={project.operating?.totalStaked ?? 0} />{" "}
            <small data-user-text>{project.symbol}</small>
          </strong>
          <span
            className={period != null && period < 0 ? "negative" : "positive"}
          >
            {period == null
              ? "—"
              : `${period >= 0 ? "+" : ""}${period.toFixed(2)}%`}
          </span>
        </div>
        <div
          className="trend-ranges"
          role="group"
          aria-label={locale === "en" ? "Time range" : "时间范围"}
        >
          {stakeRanges.map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
            >
              {r === "All" && locale === "zh-CN" ? "全部" : r}
            </button>
          ))}
        </div>
      </div>
      <div className="trend-readout" aria-live="off">
        {stamp(selected.time, true)} ·{" "}
        {selected.amount.toLocaleString(locale, { maximumFractionDigits: 4 })}{" "}
        <span data-user-text>{project.symbol}</span> ·{" "}
        {change == null
          ? "—"
          : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
      </div>
      <svg
        viewBox="0 0 760 270"
        role="img"
        data-inspected-index={hover ?? points.length - 1}
        data-latest-staked={points.at(-1)!.amount}
        aria-label={
          locale === "en"
            ? "Total staked token amount over time"
            : "Token 总质押数量随时间变化"
        }
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setHover((i) =>
              Math.max(
                0,
                Math.min(
                  points.length - 1,
                  (i ?? points.length - 1) + (e.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          const time =
            start +
            ((((e.clientX - rect.left) / rect.width) * 760 - 24) / 680) * span;
          let nearest = 0;
          points.forEach((p, i) => {
            if (
              Math.abs(p.time - time) <= Math.abs(points[nearest].time - time)
            )
              nearest = i;
          });
          setHover(nearest);
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const time =
            start +
            ((((e.clientX - rect.left) / rect.width) * 760 - 24) / 680) * span;
          let nearest = 0;
          points.forEach((p, i) => {
            if (
              Math.abs(p.time - time) <= Math.abs(points[nearest].time - time)
            )
              nearest = i;
          });
          setHover(nearest);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#635bdf" stopOpacity=".18" />
            <stop offset="1" stopColor="#635bdf" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="24"
              x2="704"
              y1={40 + v * 190}
              y2={40 + v * 190}
              stroke="#e9edf4"
            />
            <text x="754" textAnchor="end" y={44 + v * 190}>
              {compactMarketNumber(max - v * (max - min))}
            </text>
          </g>
        ))}
        <path d={`${path} L704,230 L24,230 Z`} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke="#635bdf" strokeWidth="2.5" />
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1="30"
          y2="230"
          stroke="#9aa8be"
          strokeDasharray="3 4"
        />
        <circle
          cx={x(selected)}
          cy={y(selected)}
          r="4"
          fill="#635bdf"
          stroke="white"
          strokeWidth="2"
        />
        <text x="24" y="260">
          {stamp(start)}
        </text>
        <text x="704" y="260" textAnchor="end">
          {stamp(points.at(-1)!.time)}
        </text>
      </svg>
    </section>
  );
}
