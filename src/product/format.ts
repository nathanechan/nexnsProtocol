import { parseAmount, displayAmount } from "../domain/economics/amount";
export function activityAmount(raw: string): string {
  try {
    return displayAmount(parseAmount(raw.replaceAll(",", "")));
  } catch {
    return raw;
  }
}
export function number(value: number | null | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value)
    ? "N/A"
    : new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(
        value,
      );
}
export function money(value: number | null | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value)
    ? "N/A"
    : `${number(value, digits)} USDT`;
}
export function price(value: number | null | undefined): string {
  return money(value, 5);
}
export function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? "N/A"
    : `${number(value * 100, 1)}%`;
}
export function curvePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${number(value >= 1 ? 100 : Math.min(99.99, Math.floor(value * 10000) / 100), 2)}%`;
}
export function date(value: string | null | undefined): string {
  return value
    ? new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "N/A";
}

// Internal pair enums keep legacy names; displayed assets follow current identity.
export function poolLabel(pair: string, symbol: string): string {
  return pair.startsWith("X/")
    ? `${symbol}/${pair.slice(2).replace("NEXUS", "NEXNS")}`
    : pair.replace(/^NEXUS\//, "NEXNS/");
}

export function localTime(
  value: string | number,
  locale: "zh-CN" | "en",
  timeZone?: string,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}
