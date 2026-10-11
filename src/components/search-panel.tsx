"use client";
import { useLocale } from "../i18n/locale";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useSimulation } from "../simulation/store";
import { economyService } from "../data/service";
import type { ProjectSearchService, SearchResult } from "../data/search";
import { projectKey, projectRoute } from "../domain/identity";
import {
  ContractAddress,
  EmptyState,
  ErrorState,
  LifecycleBadge,
  SearchInput,
  Skeleton,
  WalletAddress,
} from "./ui";
const matches = {
  CONTRACT: "合约精准匹配",
  PROJECT_ID: "项目 ID 匹配",
  SYMBOL: "符号匹配",
  NAME: "名称匹配",
  CREATOR: "创建者匹配",
};
export function SearchPanel({
  query,
  onQueryChange,
  onNavigate,
  service = economyService,
  compact = false,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onNavigate?: () => void;
  service?: ProjectSearchService;
  compact?: boolean;
}) {
  const { t } = useLocale();

  const revision = useSimulation((s) => s.revision);
  const id = useId();
  const router = useRouter();
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [state, setState] = useState<{
    results: SearchResult[];
    loading: boolean;
    error: boolean;
  }>({ results: [], loading: false, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setState({ results: [], loading: false, error: false });
      return;
    }
    setState({ results: [], loading: true, error: false });
    const timer = setTimeout(() => {
      service.search(query).then(
        (results) => {
          if (active) setState({ results, loading: false, error: false });
        },
        () => {
          if (active) setState({ results: [], loading: false, error: true });
        },
      );
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, service, retry, revision]);
  const openFirst = () => {
    if (state.results[0]) {
      onNavigate?.();
      router.push(projectRoute(state.results[0].project));
    }
  };
  return (
    <div className={`economy-search ${compact ? "compact" : ""}`}>
      <label className="search-label" htmlFor={id}>
        {t("搜索项目")}
      </label>
      <div className="search-input-wrap">
        <Search size={19} />
        <SearchInput
          id={id}
          aria-controls={`${id}-results`}
          placeholder={t("合约地址、项目 ID、符号、名称或创建者钱包")}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              refs.current[0]?.focus();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              openFirst();
            }
            if (e.key === "Escape") onQueryChange("");
          }}
        />
        <span className="search-hint">{t("⌘ / Ctrl K")}</span>
      </div>
      <div
        id={`${id}-results`}
        aria-busy={state.loading}
        className="search-results"
      >
        <div role="status" className="sr-only">
          {t(
            state.loading
              ? "正在搜索"
              : state.error
                ? "搜索失败"
                : query
                  ? `找到 ${state.results.length} 个项目`
                  : "",
          )}
        </div>
        {t(
          state.loading ? (
            <Skeleton />
          ) : state.error ? (
            <ErrorState onRetry={() => setRetry((n) => n + 1)} />
          ) : query.trim() && state.results.length === 0 ? (
            <EmptyState
              title={t("未找到项目")}
              description={t("请检查输入，或使用完整合约地址精准定位。")}
            />
          ) : state.results.length > 0 ? (
            <ul className="result-list">
              {t(
                state.results.map((r, i) => (
                  <li
                    className="search-result"
                    key={projectKey(r.project.chainId, r.project.tokenContract)}
                  >
                    <div className="result-main">
                      <div className="project-logo" aria-hidden>
                        {r.project.logo}
                      </div>
                      <div className="identity-body">
                        <Link
                          ref={(el) => {
                            refs.current[i] = el;
                          }}
                          href={projectRoute(r.project)}
                          className="result-link"
                          onClick={onNavigate}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                              e.preventDefault();
                              const next =
                                e.key === "ArrowDown" ? i + 1 : i - 1;
                              if (next < 0)
                                document.getElementById(id)?.focus();
                              else
                                refs.current[
                                  next % state.results.length
                                ]?.focus();
                            }
                          }}
                        >
                          {r.project.name} <small>{r.project.symbol}</small>
                          <span className="sr-only">
                            {t(" ")}
                            {t("· BSC ·")}
                            {r.project.tokenContract}
                          </span>
                        </Link>
                        <div className="identity-meta">
                          <span>
                            {t("BSC · ")}
                            {t(r.project.chainId)}
                          </span>
                          <ContractAddress address={r.project.tokenContract} />
                        </div>
                      </div>
                      <LifecycleBadge state={r.project.lifecycle} />
                    </div>
                    <div className="result-detail">
                      <span
                        className={r.match === "CONTRACT" ? "exact-match" : ""}
                      >
                        {t(matches[r.match])}
                      </span>
                      <span>
                        {t("创建者")}{" "}
                        <WalletAddress address={r.project.creatorWallet} />
                      </span>
                    </div>
                  </li>
                )),
              )}
            </ul>
          ) : !compact ? (
            <EmptyState
              title={t("精准定位每个项目")}
              description={t(
                "名称与符号可以重复。请用链与合约地址确认项目身份。",
              )}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
