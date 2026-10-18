import type { Project, Address } from "../domain/models";
import {
  CURVE_INVENTORY,
  RESERVE_TARGET,
  ledgerState,
  quoteBuy,
  quoteSell,
  rollingVolume,
  type CurveLedger,
} from "../domain/economics/curve";
import { UNIT, decimal } from "../domain/economics/amount";
import { identitySeed } from "../product/staking-history";
export function actorTrade(
  project: Project,
  ledger: CurveLedger,
  timestamp: number,
) {
  if (project.lifecycle !== "CURVE_OPEN" || !Number.isFinite(timestamp))
    return null;
  const prior = ledger.marketActor;
  if (prior && timestamp - prior.updatedAt < 8000) return null;
  const actor = prior ?? {
    usdt: (25000n * UNIT).toString(),
    tokens: "0",
    sequence: 0,
    updatedAt: 0,
  };
  if (
    !/^\d+$/.test(actor.usdt) ||
    !/^\d+$/.test(actor.tokens) ||
    !Number.isSafeInteger(actor.sequence) ||
    actor.sequence < 0
  )
    return null;
  const cash = BigInt(actor.usdt),
    tokens = BigInt(actor.tokens),
    before = ledgerState(ledger);
  if (tokens > CURVE_INVENTORY || tokens > before.sold) return null;
  const seed = identitySeed(project.tokenContract + ":" + actor.sequence);
  const side =
    tokens > UNIT && (seed % 5 === 0 || cash < 50n * UNIT) ? "sell" : "buy";
  const wallet = ("0x" +
    identitySeed(project.tokenContract)
      .toString(16)
      .padStart(8, "0")
      .repeat(5)) as Address;
  let quote;
  if (side === "buy") {
    const remaining = RESERVE_TARGET - before.reserve;
    if (remaining < 3n * UNIT || cash < UNIT) return null;
    const desired = BigInt(40 + (seed % 220)) * UNIT;
    const input = [desired, cash, remaining / 3n].reduce((a, b) =>
      a < b ? a : b,
    );
    quote = quoteBuy(before, decimal(input));
  } else quote = quoteSell(before, decimal(tokens / 5n));
  const at = new Date(timestamp).toISOString();
  return {
    side,
    wallet,
    quote,
    ledger: {
      ...ledger,
      reserve: quote.newReserve.toString(),
      sold: quote.newSold.toString(),
      ...rollingVolume(
        ledger,
        at,
        side === "buy" ? quote.accepted : quote.grossOutput,
      ),
      buyers:
        side === "buy" && !ledger.buyers.includes(wallet)
          ? [...ledger.buyers, wallet]
          : ledger.buyers,
      updatedAt: at,
      marketActor: {
        usdt: (side === "buy"
          ? cash - quote.accepted
          : cash + quote.receive
        ).toString(),
        tokens: (side === "buy"
          ? tokens + quote.tokenAmount
          : tokens - quote.tokenAmount
        ).toString(),
        sequence: actor.sequence + 1,
        updatedAt: timestamp,
      },
    } satisfies CurveLedger,
  };
}
