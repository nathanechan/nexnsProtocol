"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { Project } from "../domain/models";
import { useSimulation } from "../simulation/store";
import { useLocale } from "../i18n/locale";
import { marketCandles, type MarketCandle } from "../product/market-candles";
const tradingPrice = (value: number) =>
  "$" +
  value.toLocaleString("en-US", {
    minimumFractionDigits: value < 1 ? 6 : 4,
    maximumFractionDigits: value < 0.0001 ? 10 : value < 1 ? 6 : 4,
  });
const visibleBars = (length: number) => ({
  from: Math.max(-2, length - 80),
  to: length + 5,
});
export function ProfessionalTradingChart({ project }: { project: Project }) {
  const { locale } = useLocale();
  const activities = useSimulation((s) => s.activities),
    live = useSimulation((s) => s.liveMarket);
  const [interval, setIntervalValue] = useState(60),
    [hover, setHover] = useState<MarketCandle | null>(null);
  const bars = useMemo(
    () => marketCandles(project, activities, live, interval),
    [project, activities, live, interval],
  );
  const node = useRef<HTMLDivElement>(null),
    chart = useRef<IChartApi | null>(null),
    series = useRef<ISeriesApi<"Candlestick"> | null>(null),
    latestBars = useRef(bars),
    fitted = useRef(false);
  latestBars.current = bars;
  useEffect(() => {
    if (series.current) {
      series.current.setData(
        bars.map((b) => ({ ...b, time: b.time as UTCTimestamp })),
      );
      if (!fitted.current && bars.length) {
        chart.current
          ?.timeScale()
          .setVisibleLogicalRange(visibleBars(bars.length));
        fitted.current = true;
      }
    }
  }, [bars]);
  useEffect(() => {
    fitted.current = false;
    setHover(null);
    chart.current
      ?.timeScale()
      .setVisibleLogicalRange(visibleBars(latestBars.current.length));
  }, [interval]);
  useEffect(() => {
    const el = node.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let stopped = false,
      cleanup = () => {};
    void import("lightweight-charts").then(
      ({ createChart, CandlestickSeries, ColorType }) => {
        if (stopped) return;
        const colors = () => {
          const dark = document.documentElement.dataset.theme === "dark";
          return {
            bg: dark ? "#101217" : "#ffffff",
            text: dark ? "#a1a7b6" : "#59687e",
            grid: dark ? "#242833" : "#edf0f6",
            up: dark ? "#00F59B" : "#059669",
            down: dark ? "#FF3B69" : "#e11d48",
          };
        };
        const c = colors();
        const api = createChart(el, {
          width: el.clientWidth,
          height: 360,
          layout: {
            background: { type: ColorType.Solid, color: c.bg },
            textColor: c.text,
            attributionLogo: true,
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
          },
          grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
          rightPriceScale: { borderColor: c.grid },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: c.grid,
            rightOffset: 4,
          },
          crosshair: { mode: 0 },
          localization: {
            locale: locale === "en" ? "en-GB" : "zh-CN",
            priceFormatter: tradingPrice,
          },
        });
        const candles = api.addSeries(CandlestickSeries, {
          upColor: c.up,
          downColor: c.down,
          wickUpColor: c.up,
          wickDownColor: c.down,
          borderVisible: false,
          priceFormat: {
            type: "custom",
            formatter: tradingPrice,
            minMove: 0.000001,
          },
        });
        chart.current = api;
        series.current = candles;
        candles.setData(
          latestBars.current.map((b) => ({
            ...b,
            time: b.time as UTCTimestamp,
          })),
        );
        if (latestBars.current.length) {
          api
            .timeScale()
            .setVisibleLogicalRange(visibleBars(latestBars.current.length));
          fitted.current = true;
        }
        api.subscribeCrosshairMove((event) => {
          const value = event.seriesData.get(candles);
          setHover(
            value && "open" in value
              ? {
                  time: Number(value.time),
                  open: value.open,
                  high: value.high,
                  low: value.low,
                  close: value.close,
                }
              : null,
          );
        });
        const resize = new ResizeObserver(() =>
          api.applyOptions({ width: el.clientWidth }),
        );
        resize.observe(el);
        const theme = new MutationObserver(() => {
          const c = colors();
          api.applyOptions({
            layout: {
              background: { type: ColorType.Solid, color: c.bg },
              textColor: c.text,
            },
            grid: {
              vertLines: { color: c.grid },
              horzLines: { color: c.grid },
            },
          });
          candles.applyOptions({
            upColor: c.up,
            downColor: c.down,
            wickUpColor: c.up,
            wickDownColor: c.down,
          });
        });
        theme.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
        cleanup = () => {
          resize.disconnect();
          theme.disconnect();
          api.remove();
          chart.current = null;
          series.current = null;
        };
      },
    );
    return () => {
      stopped = true;
      cleanup();
    };
  }, [locale]);
  const selected = hover ?? bars.at(-1);
  return (
    <div className="professional-trading-chart">
      <div className="price-chart-toolbar">
        <div
          role="group"
          aria-label={locale === "en" ? "Candle interval" : "K线周期"}
        >
          {[
            [60, "1m"],
            [300, "5m"],
            [900, "15m"],
            [3600, "1h"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={interval === value}
              onClick={() => setIntervalValue(Number(value))}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => chart.current?.timeScale().fitContent()}>
          {locale === "en" ? "Reset view" : "重置视图"}
        </button>
      </div>
      <div className="candle-readout" aria-live="off">
        {selected ? (
          <>
            O {tradingPrice(selected.open)} · H {tradingPrice(selected.high)} ·
            L {tradingPrice(selected.low)} · C {tradingPrice(selected.close)}
          </>
        ) : locale === "en" ? (
          "Waiting for trades"
        ) : (
          "等待成交记录"
        )}
      </div>
      <div
        ref={node}
        className="trading-canvas"
        role="img"
        aria-label={`${project.symbol} ${locale === "en" ? "candlestick price chart" : "K线价格图"}`}
        data-bars={bars.length}
      />
      <small className="chart-attribution">
        TradingView Lightweight Charts™ ·{" "}
        <a
          href="/licenses/lightweight-charts-NOTICE.txt"
          target="_blank"
          rel="noreferrer"
        >
          {locale === "en" ? "Attribution" : "图表版权"}
        </a>
      </small>
    </div>
  );
}
