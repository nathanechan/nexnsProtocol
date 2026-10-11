import { UNIT, ceilDiv } from "./amount";
import type {
  PricePair,
  ProtocolMember,
  PositionLot,
} from "./operating-models";
export const activePrincipal = (member: ProtocolMember) =>
  member.lots
    .filter((l) => l.status === "ACTIVE")
    .reduce((v, l) => v + BigInt(l.principal), 0n);
export const remainingCapacity = (lot: PositionLot) =>
  BigInt(lot.capacity) - BigInt(lot.used);
export function validPrices(
  pair: PricePair,
): { stake: bigint; reward: bigint } | null {
  if (
    pair.status === "PRICE_INVALID" ||
    pair.status === "PRICE_DISCOVERY" ||
    !pair.direct ||
    !pair.indirect
  )
    return null;
  const a = BigInt(pair.direct),
    b = BigInt(pair.indirect);
  if (a <= 0n || b <= 0n) return null;
  const lo = a < b ? a : b,
    hi = a > b ? a : b;
  const difference = hi - lo;
  if (difference * 100n > lo * 15n) return null;
  return difference * 100n <= lo * 5n
    ? { stake: a, reward: a }
    : { stake: lo, reward: hi };
}
export function coverage(
  principal: bigint,
  staked: bigint,
  price: bigint | null,
) {
  if (price === null || price <= 0n || principal <= 0n) return null;
  return (staked * price) / principal;
}
export function tier(c: bigint | null) {
  if (c === null) return { index: null, rateBps: 0, multiplier: 0 };
  const index =
    c < (UNIT * 5n) / 100n
      ? 0
      : c < (UNIT * 15n) / 100n
        ? 1
        : c < (UNIT * 30n) / 100n
          ? 2
          : c < (UNIT * 50n) / 100n
            ? 3
            : 4;
  return { index, rateBps: index * 20, multiplier: index };
}
export function nextTier(
  principal: bigint,
  staked: bigint,
  price: bigint | null,
) {
  const current = tier(coverage(principal, staked, price));
  if (current.index === null || current.index === 4 || !price) return null;
  const target = [5n, 15n, 30n, 50n][current.index];
  const required = ceilDiv(principal * target * UNIT, 100n * price);
  return {
    target,
    required,
    additional: required > staked ? required - staked : 0n,
  };
}
export interface ContributionResult {
  value: bigint;
  effective: bigint;
  weight: bigint;
  direct: number;
  activeBranches: number;
  activeNetwork: number;
  eligible: boolean;
}
export function contributions(
  members: Record<string, ProtocolMember>,
  price: bigint | null,
): Record<string, ContributionResult> {
  const children: Record<string, string[]> = {};
  for (const m of Object.values(members)) {
    if (m.sponsor) (children[m.sponsor] ??= []).push(m.wallet);
  }
  const effective = (wallet: string) => {
    const m = members[wallet];
    if (!m) return 0n;
    const p = activePrincipal(m);
    return (
      (p * BigInt(tier(coverage(p, BigInt(m.staked), price)).multiplier)) / 4n
    );
  };
  const memo = new Map<string, { total: bigint; active: number }>();
  const visiting = new Set<string>();
  const subtree = (wallet: string): { total: bigint; active: number } => {
    if (memo.has(wallet)) return memo.get(wallet)!;
    if (visiting.has(wallet)) throw new Error("推荐关系存在循环");
    visiting.add(wallet);
    let total = effective(wallet),
      active = total > 0n ? 1 : 0;
    for (const child of children[wallet] ?? []) {
      const s = subtree(child);
      total += s.total;
      active += s.active;
    }
    visiting.delete(wallet);
    const result = { total, active };
    memo.set(wallet, result);
    return result;
  };
  const result: Record<string, ContributionResult> = {};
  let denominator = 0n;
  for (const m of Object.values(members)) {
    const branches = (children[m.wallet] ?? []).map(subtree);
    const total = branches.reduce((sum, b) => sum + b.total, 0n);
    const largest = branches.reduce(
      (max, b) => (b.total > max ? b.total : max),
      0n,
    );
    const value = total - largest;
    const eligible = activePrincipal(m) > 0n;
    result[m.wallet] = {
      value,
      effective: effective(m.wallet),
      weight: 0n,
      direct: branches.length,
      activeBranches: branches.filter((b) => b.total > 0n).length,
      activeNetwork: branches.reduce((sum, b) => sum + b.active, 0),
      eligible,
    };
    if (eligible) denominator += value;
  }
  for (const r of Object.values(result))
    r.weight =
      denominator > 0n && r.eligible ? (r.value * UNIT) / denominator : 0n;
  return result;
}
export function cumulativeClaim(gross: bigint, previousGross: bigint) {
  if (gross <= 0n) throw new Error("领取数量必须大于 0");
  const total = previousGross + gross;
  const delta = (numerator: bigint, denominator: bigint) =>
    (total * numerator) / denominator -
    (previousGross * numerator) / denominator;
  const received = delta(85n, 100n),
    burned = delta(75n, 1000n),
    creator = delta(7125n, 100000n),
    platform = delta(375n, 100000n);
  return {
    gross,
    received,
    burned,
    creator,
    platform,
    dustDelta: gross - received - burned - creator - platform,
  };
}
export function displayProgress(finalized: bigint, seconds: bigint) {
  const elapsed = seconds < 0n ? 0n : seconds > 86400n ? 86400n : seconds;
  return (finalized * elapsed) / 86400n;
}
