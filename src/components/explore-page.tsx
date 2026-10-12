"use client";
import { useLocale } from "../i18n/locale";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSimulation } from "../simulation/store";
import { economyService, type EconomyDataService } from "../data/service";
import {
  curveSorts,
  operatingSorts,
  parseExploreState,
  type Sort,
  type Stage,
} from "../data/discovery";
import { useResource } from "../product/use-resource";
import { projectKey } from "../domain/identity";
import { SearchPanel } from "./search-panel";
import { ProductTabs } from "./product-tabs";
import { ProjectCard } from "./project-card";
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Skeleton,
} from "./ui";
export function ExplorePage({
  service = economyService,
}: {
  service?: EconomyDataService;
}) {
  const { t } = useLocale();

  const revision = useSimulation((s) => s.revision);
  const params = useSearchParams();
  const router = useRouter();
  const { stage, sort, query } = parseExploreState(params);
  const [draft, setDraft] = useState(query);
  const pendingQuery = useRef<string | null>(null);
  const load = useCallback(() => {
    void revision;
    return service.discovery(stage, sort);
  }, [service, stage, sort, revision]);
  const state = useResource(load);
  const update = useCallback(
    (next: { stage?: Stage; sort?: Sort; query?: string }) => {
      const s = next.stage ?? stage;
      const target = new URLSearchParams();
      target.set("stage", s);
      target.set(
        "sort",
        next.sort ?? (next.stage ? (s === "curve" ? "progress" : "tvl") : sort),
      );
      const q = next.query ?? query;
      if (q) target.set("q", q);
      if (next.query !== undefined) {
        pendingQuery.current = next.query;
        router.replace(`/explore?${target.toString()}`, { scroll: false });
      } else router.push(`/explore?${target.toString()}`, { scroll: false });
    },
    [stage, sort, query, router],
  );
  useEffect(() => {
    if (pendingQuery.current !== null) {
      if (query === pendingQuery.current) pendingQuery.current = null;
      return;
    }
    setDraft(query);
  }, [query]);
  useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(() => update({ query: draft }), 300);
    return () => clearTimeout(timer);
  }, [draft, query, update]);
  const options = stage === "curve" ? curveSorts : operatingSorts;
  return (
    <>
      <PageHeader
        eyebrow={t("EXPLORE ECONOMIES")}
        title={t("探索项目")}
        description={t("发现头部项目，或通过搜索精准访问任意项目。")}
      />
      <section className="explore-search card" aria-label={t("搜索全部项目")}>
        <SearchPanel
          query={draft}
          onQueryChange={setDraft}
          service={service}
          compact
        />
      </section>
      <ProductTabs
        label={t("项目发现阶段")}
        items={[
          { value: "curve", label: "曲线发行" },
          { value: "operating", label: "运行中" },
        ]}
        value={stage}
        onChange={(value) => update({ stage: value as Stage })}
      >
        <div className="discovery-toolbar">
          <div>
            <h2>
              {t(stage === "curve" ? "曲线发行" : "运行中")} {t("— Top 100")}
            </h2>

            <p className={`stage-context ${stage}`}>
              {t(
                stage === "curve"
                  ? "曲线发行中，完成发行后进入下一阶段"
                  : "已完成发行与迁移的运行项目",
              )}
            </p>
          </div>
          <div className="sort-field">
            <span>{t("排序方式")}</span>
            <Select
              label={t("项目排序方式")}
              value={sort}
              options={Object.entries(options).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={(value) => update({ sort: value as Sort })}
            />
          </div>
        </div>
        {t(
          state.loading ? (
            <div className="discovery-grid">
              {t(Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />))}
            </div>
          ) : state.error ? (
            <ErrorState onRetry={state.retry} />
          ) : state.data?.length ? (
            <>
              <div className="discovery-grid">
                {t(
                  state.data.map((p, i) => (
                    <ProjectCard
                      key={projectKey(p.chainId, p.tokenContract)}
                      project={p}
                      rank={
                        p.isPlatformToken
                          ? undefined
                          : i + (state.data?.[0]?.isPlatformToken ? 0 : 1)
                      }
                    />
                  )),
                )}
              </div>
              <div className="discovery-end">
                <span>
                  {t(state.data.length)} {t("个项目")}
                </span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    document
                      .querySelector<HTMLInputElement>(".explore-search input")
                      ?.focus()
                  }
                >
                  {t("搜索")}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title={t("暂无此阶段项目")}
              description={t("可切换阶段，或通过搜索定位项目。")}
              action={
                <Button
                  variant="secondary"
                  onClick={() =>
                    update({ stage: stage === "curve" ? "operating" : "curve" })
                  }
                >
                  {t("切换阶段")}
                </Button>
              }
            />
          ),
        )}
      </ProductTabs>
    </>
  );
}
