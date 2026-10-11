import { UNIT, parseAmount } from "./amount";
import {
  activePrincipal,
  coverage,
  cumulativeClaim,
  tier,
  validPrices,
} from "./operating";
import type { OperatingBook, ProtocolMember } from "./operating-models";
export type OperatingAction = "participate" | "stake" | "unstake" | "claim";
export function operatingQuote(
  kind: OperatingAction,
  input: string,
  book: OperatingBook,
  member: ProtocolMember,
  available: bigint,
) {
  const amount = parseAmount(input);
  if (amount <= 0n) throw new Error("数量必须大于 0");
  const prices = validPrices(book.prices);
  const principal = activePrincipal(member);
  const current = coverage(
    principal,
    BigInt(member.staked),
    prices?.stake ?? null,
  );
  let next = current,
    receive = amount,
    capacity = 0n;
  if (kind === "participate") {
    if (!prices) throw new Error("当前有效价格不可用，暂不能新增参与");
    if (amount > available) throw new Error("USDT 余额不足");
    capacity = (amount * 5n) / 2n;
  }
  if (kind === "stake" || kind === "unstake") {
    if (kind === "stake" && !prices)
      throw new Error("当前有效价格不可用，覆盖率暂不可计算");
    if (amount > available)
      throw new Error(
        kind === "stake" ? "代币余额不足" : "解除数量超过已质押数量",
      );
    next = coverage(
      principal,
      kind === "stake"
        ? BigInt(member.staked) + amount
        : BigInt(member.staked) - amount,
      prices?.stake ?? null,
    );
  }
  if (kind === "claim") {
    if (BigInt(member.claimable) <= 0n) throw new Error("当前没有可领取奖励");
    if (amount > BigInt(member.claimable))
      throw new Error("领取数量超过可领取余额");
    receive = cumulativeClaim(amount, BigInt(member.lifetimeClaimed)).received;
    if (receive <= 0n) throw new Error("数量过小，无法产生有效到账");
  }
  return {
    amount,
    capacity,
    receive,
    current,
    next,
    currentTier: tier(current),
    nextTier: tier(next),
    balanceAfter:
      kind === "unstake"
        ? available - amount
        : kind === "claim"
          ? BigInt(member.claimable) - amount
          : available - amount,
    estimatedValue: prices ? (receive * prices.reward) / UNIT : null,
  };
}
