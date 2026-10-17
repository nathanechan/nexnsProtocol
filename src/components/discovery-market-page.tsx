"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  discoverRows,
  marketRows,
  marketRow,
  marketService,
  defaultMarketSort,
  marketSorts,
  type DiscoveryTab,
  type MarketDataService,
  type MarketSection,
  type MarketSort,
  type MarketRow,
} from "../data/market";
import { simulationStore, useSimulation } from "../simulation/store";
import { marketDataAdapter } from "../simulation/live-market";
import { useResource } from "../product/use-resource";
import { useLocale } from "../i18n/locale";
import { marketCopy } from "../i18n/market";
import { projectName } from "../product/metadata";
import { compactMarketNumber, marketChange } from "../product/market-format";
import { curvePercent } from "../product/format";
import { AnimatedAmount } from "./animated-amount";
import { ProjectLogo } from "./project-logo";

const storageKey = "nexns-watchlist-v1";
function DiscoveryRow({
  initial,
  favorite,
  toggle,
}: {
  initial: MarketRow;
  favorite: boolean;
  toggle: () => void;
}) {
  const project = useSimulation((s) => s.projects[initial.key]);
  const row = project ? marketRow(project) : initial;
  const { locale } = useLocale();
  const c = marketCopy[locale];
  const change = (
    <span
      className={`change-number ${row.change != null && row.change > 0 ? "positive" : row.change != null && row.change < 0 ? "negative" : ""}`}
    >
      {row.change == null ? "—" : marketChange(row.change)}
    </span>
  );
  return (
    <li className="discovery-row">
      <button
        className="watch-star"
        aria-label={favorite ? c.removeWatch : c.addWatch}
        aria-pressed={favorite}
        onClick={toggle}
      >
        {favorite ? "★" : "☆"}
      </button>
      <Link
        className={`market-row discovery-project-row live-project-row ${row.platform ? "platform-row" : ""}`}
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
            <strong
              className="live-token-name"
              data-token-symbol
              data-user-text
            >
              {row.symbol}
            </strong>
            {!row.platform && (
              <small
                className="live-token-symbol"
                data-token-name
                data-user-text
                title={projectName(row, locale)}
              >
                {projectName(row, locale)}
              </small>
            )}
          </span>
        </span>
        <span className="market-cell market-price reference-price">
          <span className="market-value">
            {row.price == null ? (
              "N/A"
            ) : (
              <AnimatedAmount value={row.price} price />
            )}
          </span>
          <span className="mobile-change">{change}</span>
        </span>
        <span className="market-cell market-change">
          <span className="market-value">{change}</span>
        </span>
        {row.stage === "CURVE_OPEN" ? (
          <span className="market-cell market-progress-cell">
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
          </span>
        ) : (
          <span className="market-cell market-staked">
            <span className="market-value">
              {row.value == null ? (
                "N/A"
              ) : (
                <AnimatedAmount value={row.value} currency />
              )}
            </span>
          </span>
        )}
        <span className="market-cell market-participants">
          <span className="market-value">
            {compactMarketNumber(row.participants)}
          </span>
        </span>
      </Link>
    </li>
  );
}
export function DiscoveryMarketPage({
  section,
  service = marketService,
  navigationPath,
}: {
  section: MarketSection;
  service?: MarketDataService;
  navigationPath?: string;
}) {
  const { locale } = useLocale();
  const c = marketCopy[locale];
  const params = useSearchParams();
  const router = useRouter();
  const revision = useSimulation((s) => s.revision);
  const hydrated = useSimulation((s) => s.hydrated);
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const value: unknown = JSON.parse(
          localStorage.getItem(storageKey) ?? "[]",
        );
        setFavorites(
          Array.isArray(value)
            ? value.filter(
                (v): v is string =>
                  typeof v === "string" && /^\d+:0x[0-9a-f]{40}$/.test(v),
              )
            : [],
        );
      } catch {
        setFavorites([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const toggle = (key: string) =>
    setFavorites((previous) => {
      const next = previous.includes(key)
        ? previous.filter((v) => v !== key)
        : [...previous, key];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  const requested = params.get("sort");
  const sort =
    requested && marketSorts[section].includes(requested as MarketSort)
      ? (requested as MarketSort)
      : defaultMarketSort(section);
  const tab = (
    ["watchlist", "hot", "new", "all"].includes(params.get("tab") ?? "")
      ? params.get("tab")
      : "hot"
  ) as DiscoveryTab;
  const direction = params.get("dir") === "asc" ? "asc" : "desc";
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
  const rows = discoverRows(
    state.data ?? [],
    section,
    tab,
    favorites,
    requested && marketSorts[section].includes(requested as MarketSort)
      ? requested
      : null,
    direction,
    params.get("q") ?? "",
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    if (key === "sort")
      next.set(
        "dir",
        requested === value && direction === "desc" ? "asc" : "desc",
      );
    router.replace(`${navigationPath ?? `/${section}`}?${next}`, {
      scroll: false,
    });
  };
  const columns = [
    { label: c.liveToken, sort: null },
    { label: c.price, sort: "price" },
    { label: c.listChange, sort: "change" },
    {
      label: section === "launch" ? c.listProgress : c.liveStaked,
      sort: section === "launch" ? "progress" : "staked",
    },
    { label: c.liveUsers, sort: "users" },
  ];
  return (
    <section
      className={`market-page market-surface discovery-surface ${section}`}
    >
      <div className="market-toolbar">
        <h1>{c[section]}</h1>
      </div>
      <div className="discovery-tabs" role="tablist" aria-label={c.discovery}>
        {(["watchlist", "hot", "new", "all"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => update("tab", value)}
          >
            {c[value]}
          </button>
        ))}
      </div>
      <div className="market-list" aria-label={c.list}>
        <div className="market-columns" role="row">
          {columns.map((column, i) => (
            <span
              key={i}
              role="columnheader"
              aria-sort={
                column.sort && requested === column.sort
                  ? direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              className={`header-${column.sort ?? "token"}`}
            >
              {column.sort ? (
                <button onClick={() => update("sort", column.sort!)}>
                  {column.label}
                  {requested === column.sort && (
                    <b aria-hidden="true">
                      {direction === "asc" ? " ↑" : " ↓"}
                    </b>
                  )}
                </button>
              ) : (
                column.label
              )}
            </span>
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
            {c.error}
            <button onClick={state.retry}>{c.retry}</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="market-feedback">
            {tab === "watchlist" ? c.emptyWatch : c.empty}
          </div>
        ) : (
          <ul aria-label={c.list}>
            {rows.map((row) => (
              <DiscoveryRow
                key={row.key}
                initial={row}
                favorite={favorites.includes(row.key)}
                toggle={() => toggle(row.key)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
