import { UNIT, ceilDiv, parseAmount } from "./amount";
export const CURVE_INVENTORY = 800000n * UNIT;
export const MIGRATION_INVENTORY = 200000n * UNIT;
export const GENESIS_SUPPLY = 1000000n * UNIT;
export const RESERVE_TARGET = 100000n * UNIT;
// Rational constants preserve the thirds in the frozen virtual-reserve curve.
const A3 = 3200000n * UNIT;
const B3 = 100000n * UNIT;
export interface CurveLedger {
  creatorRevenue?: string;
  reserve: string;
  sold: string;
  volume: string;
  volumeEvents?: { timestamp: string; amount: string }[];
  seedVolume?: string;
  seedVolumeAt?: string;
  buyers: string[];
  seedParticipants: number;
  completedAt: string | null;
  updatedAt: string;
}
export function rollingVolume(
  ledger: CurveLedger,
  at: string,
  amount = 0n,
): Pick<
  CurveLedger,
  "volume" | "volumeEvents" | "seedVolume" | "seedVolumeAt"
> {
  const cutoff = Date.parse(at) - 86400000;
  const seedVolume = ledger.seedVolume ?? ledger.volume;
  const seedVolumeAt = ledger.seedVolumeAt ?? ledger.updatedAt;
  const volumeEvents = (ledger.volumeEvents ?? []).filter(
    (e) => Date.parse(e.timestamp) > cutoff,
  );
  if (amount > 0n)
    volumeEvents.push({ timestamp: at, amount: amount.toString() });
  const total = volumeEvents.reduce(
    (sum, e) => sum + BigInt(e.amount),
    Date.parse(seedVolumeAt) > cutoff ? BigInt(seedVolume) : 0n,
  );
  return { volume: total.toString(), volumeEvents, seedVolume, seedVolumeAt };
}
export interface CurveState {
  reserve: bigint;
  sold: bigint;
}
export interface CurveQuote {
  side: "buy" | "sell";
  entered: bigint;
  accepted: bigint;
  unused: bigint;
  fee: bigint;
  netInput: bigint;
  tokenAmount: bigint;
  grossOutput: bigint;
  receive: bigint;
  newReserve: bigint;
  newSold: bigint;
  newPrice: bigint;
  progress: bigint;
  graduates: boolean;
  before: CurveState;
}
export function reserveAtSold(sold: bigint): bigint {
  if (sold < 0n || sold > CURVE_INVENTORY) throw new Error("库存状态无效");
  return ceilDiv(B3 * sold, A3 - 3n * sold);
}
export function soldAtReserve(reserve: bigint): bigint {
  if (reserve < 0n || reserve > RESERVE_TARGET) throw new Error("储备状态无效");
  return (A3 * reserve) / (B3 + 3n * reserve);
}
export function priceAtSold(sold: bigint): bigint {
  if (sold < 0n || sold > CURVE_INVENTORY) throw new Error("库存状态无效");
  const d = A3 - 3n * sold;
  return (A3 * B3 * UNIT) / (d * d);
}
export function graduation(state: CurveState): boolean {
  return state.reserve === RESERVE_TARGET && state.sold === CURVE_INVENTORY;
}
export function validateCurve(state: CurveState) {
  if (
    state.reserve < 0n ||
    state.reserve > RESERVE_TARGET ||
    state.sold < 0n ||
    state.sold > CURVE_INVENTORY ||
    state.reserve < reserveAtSold(state.sold)
  )
    throw new Error("曲线状态无效，报价暂不可用");
}
export function quoteBuy(state: CurveState, input: string): CurveQuote {
  validateCurve(state);
  const entered = parseAmount(input);
  if (entered <= 0n) throw new Error("买入金额必须大于0");
  if (graduation(state) || state.sold === CURVE_INVENTORY)
    throw new Error("曲线已完成，交易已关闭");
  const needed = RESERVE_TARGET - state.reserve;
  const cap = ceilDiv(needed * 100n, 99n);
  const accepted = entered < cap ? entered : cap;
  const fee = ceilDiv(accepted, 100n);
  const netInput = accepted - fee;
  const newReserve = state.reserve + netInput;
  const newSold = soldAtReserve(newReserve);
  const tokenAmount = newSold - state.sold;
  if (netInput <= 0n || tokenAmount <= 0n)
    throw new Error("金额过小，无法获得有效报价");
  return {
    side: "buy",
    entered,
    accepted,
    unused: entered - accepted,
    fee,
    netInput,
    tokenAmount,
    grossOutput: 0n,
    receive: tokenAmount,
    newReserve,
    newSold,
    newPrice: priceAtSold(newSold),
    progress: (newReserve * UNIT) / RESERVE_TARGET,
    graduates: graduation({ reserve: newReserve, sold: newSold }),
    before: state,
  };
}
export function quoteSell(state: CurveState, input: string): CurveQuote {
  validateCurve(state);
  const tokenAmount = parseAmount(input);
  if (tokenAmount <= 0n) throw new Error("卖出数量必须大于0");
  if (graduation(state)) throw new Error("曲线已完成，交易已关闭");
  if (tokenAmount > state.sold) throw new Error("卖出数量超过曲线允许范围");
  const newSold = state.sold - tokenAmount;
  const newReserve = reserveAtSold(newSold);
  const grossOutput = state.reserve - newReserve;
  const fee = ceilDiv(grossOutput, 100n);
  const receive = grossOutput - fee;
  if (receive <= 0n) throw new Error("数量过小，无法获得有效报价");
  return {
    side: "sell",
    entered: tokenAmount,
    accepted: tokenAmount,
    unused: 0n,
    fee,
    netInput: 0n,
    tokenAmount,
    grossOutput,
    receive,
    newReserve,
    newSold,
    newPrice: priceAtSold(newSold),
    progress: (newReserve * UNIT) / RESERVE_TARGET,
    graduates: false,
    before: state,
  };
}
export function ledgerState(ledger: CurveLedger): CurveState {
  return { reserve: BigInt(ledger.reserve), sold: BigInt(ledger.sold) };
}
export function curveSeries(current: CurveState) {
  const samples = Array.from({ length: 33 }, (_, i) => {
    const reserve = (RESERVE_TARGET * BigInt(i)) / 32n;
    const sold = soldAtReserve(reserve);
    return { reserve, price: priceAtSold(sold), current: false };
  });
  return [
    ...samples.filter((p) => p.reserve !== current.reserve),
    {
      reserve: current.reserve,
      price: priceAtSold(current.sold),
      current: true,
    },
  ].sort((a, b) =>
    a.reserve < b.reserve ? -1 : a.reserve > b.reserve ? 1 : 0,
  );
}
