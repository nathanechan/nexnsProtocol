"use client";
import { useState } from "react";
import type { Project } from "../domain/models";
import { useLocale } from "../i18n/locale";
import { StakingChart } from "./staking-chart";
import { ProfessionalTradingChart } from "./professional-trading-chart";
export function OperatingCharts({ project }: { project: Project }) {
  const { locale } = useLocale();
  const [view, setView] = useState("price");
  return (
    <section className="terminal-chart operating-chart-views">
      <div
        className="curve-chart-switch"
        role="group"
        aria-label={locale === "en" ? "Chart view" : "图表视图"}
      >
        <button
          aria-pressed={view === "price"}
          onClick={() => setView("price")}
        >
          {locale === "en" ? "Price" : "价格走势"}
        </button>
        <button
          aria-pressed={view === "stake"}
          onClick={() => setView("stake")}
        >
          {locale === "en" ? "Staking Trend" : "质押趋势"}
        </button>
      </div>
      {view === "price" ? (
        <ProfessionalTradingChart project={project} />
      ) : (
        <StakingChart project={project} />
      )}
    </section>
  );
}
