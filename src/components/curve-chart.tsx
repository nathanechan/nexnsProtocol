"use client";
import { useLocale } from "../i18n/locale";
import {
  Area,
  AreaChart,
  ReferenceDot,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import { curveSeries, ledgerState } from "../domain/economics/curve";
import { displayNumber } from "../domain/economics/amount";
import { useSimulation } from "../simulation/store";
import { projectKey } from "../domain/identity";
import type { Project } from "../domain/models";
export function CurveChart({ project }: { project: Project }) {
  const { t } = useLocale();

  const id = useId().replaceAll(":", "");
  const ledger = useSimulation(
    (s) => s.curves[projectKey(project.chainId, project.tokenContract)],
  );
  const data = ledger
    ? curveSeries(ledgerState(ledger)).map((p) => ({
        reserve: displayNumber(p.reserve),
        price: displayNumber(p.price),
      }))
    : [];
  return (
    <figure className="curve-chart">
      <figcaption>
        <strong>{t("曲线价格与发行进度")}</strong>
        <span>{t("曲线发行 · USDT")}</span>
      </figcaption>
      <div className="chart-canvas" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 18, right: 12, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#426ce6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#426ce6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf0f6" vertical={false} />
            <XAxis
              dataKey="reserve"
              type="number"
              domain={[0, 100000]}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 10, fill: "#63728a" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fontSize: 10, fill: "#63728a" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              labelFormatter={(v) =>
                t(`净储备 ${Number(v).toLocaleString("zh-CN")} USDT`)
              }
              formatter={(v) => [
                Number(v).toFixed(5) + " USDT",
                t("曲线参考价格"),
              ]}
            />
            <ReferenceDot
              x={project.curve.netReserve}
              y={project.curve.curvePrice}
              r={5}
              fill="#426ce6"
              stroke="#fff"
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#426ce6"
              strokeWidth={2.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p>
        {t(
          "起始价格 0.03125 USDT · 发行完成价格 0.50000 USDT。横轴：净储备 · 当前",
        )}
        {t(" ")}
        {t(project.curve.netReserve.toLocaleString("zh-CN"))}
        {t(" ")}
        {t("USDT；纵轴：曲线参考价格 · 当前")}{" "}
        {t(project.curve.curvePrice.toFixed(5))}
        {t(" ")}
        {t("USDT。")}
      </p>
    </figure>
  );
}
