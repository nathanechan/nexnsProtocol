import { personalRows } from "./read-model";
import { parseAmount, UNIT } from "../domain/economics/amount";
import { validPrices } from "../domain/economics/operating";
export function portfolioSummary(rows: ReturnType<typeof personalRows>) {
  const sum = (field: "balance" | "claimable" | "stake") => {
    let total = 0n;
    for (const r of rows) {
      const quantity =
        field === "balance"
          ? r.balance
          : field === "stake"
            ? r.staked
            : BigInt(r.member?.claimable ?? "0");
      if (!quantity) continue;
      const prices = r.book ? validPrices(r.book.prices) : null;
      const price =
        field === "stake"
          ? prices?.stake
          : r.p.lifecycle === "CURVE_OPEN"
            ? parseAmount(String(r.p.curve.curvePrice))
            : prices?.reward;
      if (price == null) return null;
      total += (quantity * price) / UNIT;
    }
    return total;
  };
  return {
    tokens: sum("balance"),
    staked: sum("stake"),
    claimable: sum("claimable"),
    principal: rows.reduce((n, r) => n + r.principal, 0n),
    activeProjects: rows.filter(
      (r) =>
        r.balance > 0n ||
        r.principal > 0n ||
        r.staked > 0n ||
        BigInt(r.member?.claimable ?? "0") > 0n,
    ).length,
  };
}
