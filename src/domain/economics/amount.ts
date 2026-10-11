// Canonical financial amounts are 18-decimal integers. Numbers are display-only.
export const UNIT = 10n ** 18n;
export function parseAmount(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value.trim()) || value.length > 80)
    throw new Error("请输入有效数量，最多支持18位小数");
  const [whole, fraction = ""] = value.trim().split(".");
  return BigInt(whole) * UNIT + BigInt(fraction.padEnd(18, "0"));
}
export function decimal(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const n = value < 0n ? -value : value;
  const fraction = (n % UNIT).toString().padStart(18, "0").replace(/0+$/, "");
  return `${sign}${n / UNIT}${fraction ? "." + fraction : ""}`;
}
export function displayAmount(value: bigint, digits = 6): string {
  if (value > 0n && digits > 0 && value < 10n ** BigInt(18 - digits))
    return `<0.${"0".repeat(digits - 1)}1`;
  const parts = decimal(value).split(".");
  const fraction = (parts[1] ?? "").slice(0, digits).replace(/0+$/, "");
  return `${BigInt(parts[0]).toLocaleString("zh-CN")}${fraction ? "." + fraction : ""}`;
}
export const ceilDiv = (a: bigint, b: bigint): bigint => {
  if (a < 0n || b <= 0n) throw new Error("Invalid division");
  return (a + b - 1n) / b;
};
export const displayNumber = (value: bigint): number => Number(decimal(value));
