"use client";
import { AnimatedAmount } from "./animated-amount";
import Link from "next/link";
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { simulationStore, useSimulation } from "../simulation/store";
import {
  defaultMarketSort,
  marketSorts,
  marketService,
  marketRow,
  marketRows,
  type MarketDataService,
  type MarketRow,
  type MarketSection,
  type MarketSort,
} from "../data/market";
import { useResource } from "../product/use-resource";
import {
  compactMarketNumber,
  marketPrice,
  marketChange,
} from "../product/market-format";
import { curvePercent } from "../product/format";
import { shortAddress } from "../domain/identity";
import { projectName } from "../product/metadata";
import { useLocale } from "../i18n/locale";
import { marketCopy } from "../i18n/market";
import { StakeSparkline } from "./staking-chart";
import { liveStakeHistory, marketDataAdapter } from "../simulation/live-market";
import { ProjectLogo } from "./project-logo";

type Copy = typeof marketCopy.en;
function MarketItem({
  row,
  section,
  c,
}: {
  row: MarketRow;
  section: MarketSection;
  c: Copy;
}) {
  const { locale } = useLocale();
  const project = useSimulation((s) => s.projects[row.key]);
  const activities = useSimulation((s) => s.activities);
  const live = useSimulation((s) => s.liveMarket);
  if (project) row = marketRow(project);
  const launch = row.stage === "CURVE_OPEN";
  const cell = (kind: string, label: string, value: React.ReactNode) => (
    <span className={`market-cell ${kind}`}>
      <span className="market-cell-label">{label}</span>
      <span className="market-value">{value}</span>
    </span>
  );
  return (
    <li>
      <Link
        className={`market-row ${row.platform ? "platform-row" : ""}`}
        href={row.href}
        data-stage={row.stage}
      >
        <span className="market-identity">
          <span className="market-logo" aria-hidden="true">
            <ProjectLogo
              logo={row.logo}
              identity={row.key}
              platform={row.platform}
            />
          </span>
          <span className="market-token">
            <span className="market-token-line">
              <strong data-user-text>{row.symbol}</strong>
              {!row.platform && (
                <span className="market-name" data-user-text>
                  {projectName(row, locale)}
                </span>
              )}
            </span>
            <span className="market-token-detail">
              {section === "markets" && (
                <span
                  className={`market-mobile-stage ${launch ? "launch" : "live"}`}
                >
                  {launch ? c.launchStage : c.liveStage}
                </span>
              )}
              <span className="market-contract" title={row.contract}>
                {shortAddress(row.contract)}
              </span>
            </span>
          </span>
        </span>
        {section !== "live" &&
          cell("market-price", c.price, marketPrice(row.price))}
        {section === "markets" &&
          cell(
            `market-change ${row.change !== null && row.change > 0 ? "positive" : row.change !== null && row.change < 0 ? "negative" : ""}`,
            c.change,
            marketChange(row.change),
          )}
        {section === "markets" &&
          cell(
            "market-stage",
            c.stage,
            <span
              className={`market-stage-badge ${launch ? "launch" : "live"}`}
            >
              {launch ? c.launchStage : c.liveStage}
            </span>,
          )}
        {section === "live" &&
          cell(
            "market-staked",
            c.staked,
            <>
              <strong>
                <AnimatedAmount value={row.totalStaked ?? 0} />{" "}
                <small data-user-text>{row.symbol}</small>
              </strong>
              {project && (
                <StakeSparkline
                  points={liveStakeHistory(project, activities, live)}
                />
              )}
            </>,
          )}
        {cell(
          "market-metric",
          launch ? c.progress : c.value,
          launch ? (
            <span className="market-progress">
              <span>{curvePercent(row.progress)}</span>
              <span className="market-progress-track" aria-hidden="true">
                <i
                  style={{
                    width: `${Math.max(0, Math.min(100, (row.progress ?? 0) * 100))}%`,
                  }}
                />
              </span>
            </span>
          ) : row.value == null ? (
            "N/A"
          ) : (
            <AnimatedAmount value={row.value} currency />
          ),
        )}
        {section === "launch" &&
          cell(
            "market-remaining",
            c.remaining,
            <>
              {compactMarketNumber(row.remaining)}
              <span className="market-unit"> USDT</span>
            </>,
          )}
        {cell("market-volume", c.volume, compactMarketNumber(row.volume, true))}
        {section === "live" &&
          cell(
            "market-liquidity",
            c.liquidity,
            compactMarketNumber(row.liquidity, true),
          )}
        {cell(
          "market-participants",
          section === "live" ? c.users : c.participants,
          compactMarketNumber(row.participants),
        )}
        {section === "live" &&
          cell(
            "market-price reference-price",
            c.price,
            row.price == null ? (
              "N/A"
            ) : (
              <AnimatedAmount value={row.price} price />
            ),
          )}
      </Link>
    </li>
  );
}
export function MarketPage({
  section,
  service = marketService,
}: {
  section: MarketSection;
  service?: MarketDataService;
}) {
  const { locale } = useLocale();
  const c = marketCopy[locale];
  const params = useSearchParams(),
    router = useRouter();
  const revision = useSimulation((s) => s.revision);
  const hydrated = useSimulation((s) => s.hydrated);
  const requested = params.get("sort");
  const sort =
    requested && marketSorts[section].includes(requested as MarketSort)
      ? (requested as MarketSort)
      : defaultMarketSort(section);
  const load = useCallback(() => {
    void revision;
    void hydrated;
    return service.list(section, sort);
  }, [service, section, sort, revision, hydrated]);
  const state = useResource(
    load,
    service === marketService
      ? marketRows(
          Object.values(marketDataAdapter(simulationStore.getState()).projects),
          section,
          sort,
        )
      : undefined,
  );
  const labels: Record<MarketSort, string> = {
    volume: c.sortVolume,
    change: c.sortChange,
    stage: c.sortStage,
    newest: c.newest,
    progress: c.sortProgress,
    participants: section === "live" ? c.sortActive : c.sortParticipants,
    tvl: c.value,
    liquidity: c.liquidity,
    marketCap: c.marketCap,
    price: c.price,
    staked: c.staked,
    value: c.value,
    users: c.users,
  };
  const changeSort = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    router.replace(`/${section}?${next}`, { scroll: false });
  };
  const headers =
    section === "markets"
      ? [
          c.token,
          c.price,
          c.change,
          c.stage,
          c.metric,
          c.volume,
          c.participants,
        ]
      : section === "launch"
        ? [c.token, c.price, c.progress, c.remaining, c.volume, c.participants]
        : [
            c.token,
            c.staked,
            c.value,
            c.volume,
            c.liquidity,
            section === "live" ? c.users : c.participants,
            c.price,
          ];
  return (
    <section className={`market-page market-surface ${section}`}>
      <div className="market-toolbar">
        <h1>{c[section]}</h1>
        <label>
          <span className="sr-only">{c.sort}</span>
          <select
            aria-label={c.sort}
            value={sort}
            onChange={(e) => changeSort(e.target.value)}
          >
            {marketSorts[section].map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="market-list" aria-label={c.list}>
        <div className="market-columns" aria-hidden="true">
          {headers.map((header, i) => (
            <span key={i}>{header}</span>
          ))}
        </div>
        {state.loading ? (
          <div role="status" aria-label={c.loading} className="market-loading">
            {Array.from({ length: 10 }, (_, i) => (
              <div className="market-skeleton" key={i}>
                <i />
                <i />
                <i />
              </div>
            ))}
          </div>
        ) : state.error ? (
          <div className="market-feedback" role="alert">
            <span>{c.error}</span>
            <button className="button secondary" onClick={state.retry}>
              {c.retry}
            </button>
          </div>
        ) : !state.data?.length ? (
          <div className="market-feedback">{c.empty}</div>
        ) : (
          <ul aria-label={c.list}>
            {state.data.map((row) => (
              <MarketItem key={row.key} row={row} section={section} c={c} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
