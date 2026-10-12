const valid = (v: number | null) => v !== null && Number.isFinite(v);
export function compactMarketNumber(
  v: number | null,
  currency = false,
): string {
  if (!valid(v)) return "N/A";
  const absolute = Math.abs(v!);
  const unit =
    absolute >= 1e9 ? 1e9 : absolute >= 1e6 ? 1e6 : absolute >= 1e3 ? 1e3 : 1;
  const suffix =
    unit === 1e9 ? "B" : unit === 1e6 ? "M" : unit === 1e3 ? "K" : "";
  return (
    (currency ? "$" : "") +
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: unit === 1 ? (currency ? 2 : 0) : 2,
    }).format(v! / unit) +
    suffix
  );
}
export function marketPrice(v: number | null): string {
  if (!valid(v)) return "N/A";
  return (
    "$" +
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: v! >= 1 ? 2 : v! >= 0.001 ? 4 : 8,
    }).format(v!)
  );
}
export function marketChange(v: number | null): string {
  if (!valid(v)) return "N/A";
  return (
    (v! > 0 ? "+" : v! < 0 ? "−" : "") +
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(v!) * 100) +
    "%"
  );
}
