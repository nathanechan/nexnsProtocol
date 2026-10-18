"use client";
import { useState } from "react";

import type { Project } from "../domain/models";
import { useLocale } from "../i18n/locale";
import { useSimulation } from "../simulation/store";
import { curvePriceHistory } from "../product/curve-price-history";
import { marketPrice, marketChange } from "../product/market-format";
import { CurveChart } from "./curve-chart";
import { ProfessionalTradingChart } from "./professional-trading-chart";
export function CurveMarketChart({ project }: { project: Project }) {
  const { locale } = useLocale();
  const [view, setView] = useState("price");
  const hours = 24;

  const activities = useSimulation((s) => s.activities),
    live = useSimulation((s) => s.liveMarket);
  const data = curvePriceHistory(
    project,
    activities,
    live?.now ?? Date.now(),
    hours,
  );
  const prices = data.map((p) => p.price),
    latest = prices.at(-1),
    first = prices[0];
  const change = first && latest ? latest / first - 1 : null;
  return (
    <div className="curve-market-chart">
      <div
        className="curve-chart-switch"
        role="group"
        aria-label={locale === "en" ? "Chart view" : "图表视图"}
      >
        <button
          aria-pressed={view === "price"}
          onClick={() => setView("price")}
        >
          {locale === "en" ? "Price history" : "价格走势"}
        </button>
        <button
          aria-pressed={view === "curve"}
          onClick={() => setView("curve")}
        >
          {locale === "en" ? "Issuance curve" : "发行曲线"}
        </button>
      </div>
      {view === "curve" ? (
        <CurveChart project={project} />
      ) : (
        <figure className="quote-history professional-price-chart">
          <figcaption>
            <div>
              <strong>{marketPrice(project.curve.curvePrice)}</strong>
              <span
                className={
                  change != null && change < 0 ? "negative" : "positive"
                }
              >
                {change === null ? "—" : marketChange(change)}
              </span>
            </div>
            <span>{project.symbol} · USDT</span>
          </figcaption>
          <ProfessionalTradingChart project={project} />
        </figure>
      )}
    </div>
  );
}
