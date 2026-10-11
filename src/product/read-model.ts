import type { SimulationData } from "../simulation/store";
import type { Activity, Project, ProjectKey } from "../domain/models";
import { projectKey } from "../domain/identity";
import {
  activePrincipal,
  contributions,
  coverage,
  tier,
  validPrices,
} from "../domain/economics/operating";
import { parseAmount, UNIT, displayAmount } from "../domain/economics/amount";
import { MAX_SUPPLY } from "../domain/economics/settlement";
import type { OperatingBook } from "../domain/economics/operating-models";

export const userActionTypes = [
  "BUY",
  "SELL",
  "PARTICIPATE",
  "STAKE",
  "UNSTAKE",
  "REWARD_SETTLED",
  "CLAIM",
  "POSITION_COMPLETED",
] as const;
export const actionLabels: Record<Activity["type"], string> = {
  CREATE: "项目创建",
  BUY: "曲线买入",
  SELL: "曲线卖出",
  PARTICIPATE: "参与",
  STAKE: "质押",
  UNSTAKE: "解除质押",
  CLAIM: "领取完成",
  CURVE_COMPLETED: "曲线完成",
  MIGRATION_COMPLETED: "迁移完成",
  REWARD_SETTLED: "奖励已结算",
  POSITION_COMPLETED: "头寸完成",
  LIFECYCLE: "生命周期",
  SUPPLY_BURNED: "供应已销毁",
  POL_UPDATED: "协议流动性已更新",
};
export const chronological = (events: Activity[]) =>
  [...events].sort(
    (a, b) =>
      Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
      b.id.localeCompare(a.id),
  );
export function supplyResult(
  s: Pick<SimulationData, "operatingBooks">,
  p: Project,
) {
  const b = s.operatingBooks[projectKey(p.chainId, p.tokenContract)];
  const minted = BigInt(b?.lifetimeMinted ?? String(1000000n * UNIT));
  const burned = b ? BigInt(b.base.burned) + BigInt(b.burned) : 0n;
  return {
    genesis: 1000000n * UNIT,
    minted,
    burned,
    total: minted - burned,
    remaining: MAX_SUPPLY - minted,
  };
}
export function personalRows(
  s: Pick<
    SimulationData,
    | "projects"
    | "operatingBooks"
    | "currentUser"
    | "exactBalances"
    | "activities"
  >,
) {
  const wallet = s.currentUser.wallet;
  const touched = new Set(
    s.activities
      .filter(
        (a) =>
          a.wallet === wallet &&
          userActionTypes.includes(a.type as (typeof userActionTypes)[number]),
      )
      .map((a) => a.projectKey),
  );
  return Object.entries(s.projects).flatMap(([identity, p]) => {
    const key = identity as ProjectKey,
      book = s.operatingBooks[key],
      member = book?.members[wallet];
    const balance = BigInt(s.exactBalances[key] ?? "0");
    if (
      !touched.has(key) &&
      balance === 0n &&
      !member?.bound &&
      !member?.lots.length &&
      !BigInt(member?.staked ?? "0")
    )
      return [];
    const principal = member ? activePrincipal(member) : 0n;
    const prices = book ? validPrices(book.prices) : null;
    const staked = BigInt(member?.staked ?? "0");
    const stakeValue = prices ? (staked * prices.stake) / UNIT : null;
    const c = coverage(principal, staked, prices?.stake ?? null);
    const graph = book
      ? contributions(book.members, prices?.stake ?? null)
      : {};
    const yesterday = book?.settlements.at(-1)?.members[wallet]?.gross ?? "0";
    return [
      {
        key,
        p,
        book,
        member,
        balance,
        principal,
        staked,
        stakeValue,
        coverage: c,
        tier: tier(c),
        network: graph[wallet],
        yesterday: BigInt(yesterday),
        remaining:
          member?.lots.reduce(
            (sum, l) => sum + BigInt(l.capacity) - BigInt(l.used),
            0n,
          ) ?? 0n,
      },
    ];
  });
}
export function recordedAmount(a: Activity, field: string): bigint {
  try {
    return parseAmount((a.displayValues[field] ?? "0").replaceAll(",", ""));
  } catch {
    return 0n;
  }
}
export function creatorCurveRevenue(
  s: Pick<SimulationData, "curves" | "activities">,
  key: ProjectKey,
) {
  const recorded = s.curves[key]?.creatorRevenue;
  return recorded !== undefined
    ? BigInt(recorded)
    : s.activities
        .filter(
          (a) =>
            a.projectKey === key && (a.type === "BUY" || a.type === "SELL"),
        )
        .reduce((sum, a) => sum + recordedAmount(a, "fee") / 2n, 0n);
}
export function publicOutcomes(
  s: Pick<SimulationData, "projects" | "operatingBooks" | "activities">,
): Activity[] {
  const events = s.activities.filter((a) =>
    [
      "CREATE",
      "CURVE_COMPLETED",
      "MIGRATION_COMPLETED",
      "REWARD_SETTLED",
      "CLAIM",
    ].includes(a.type),
  );
  const liquidity = events
    .filter((a) => a.type === "MIGRATION_COMPLETED")
    .map((a) => ({
      ...a,
      id: `POL-${a.id}`,
      type: "POL_UPDATED" as const,
      displayValues: {
        summary: `协议流动性结果已建立 · ${s.projects[a.projectKey]?.symbol ?? ""}`,
      },
    }));
  const burns: Activity[] = [];
  for (const [key, b] of Object.entries(s.operatingBooks)) {
    const previous: Record<string, bigint> = {};
    for (const c of b.claims) {
      const before = previous[c.wallet] ?? 0n,
        total = before + BigInt(c.gross),
        burn = (total * 75n) / 1000n - (before * 75n) / 1000n;
      previous[c.wallet] = total;
      if (burn > 0n)
        burns.push({
          id: `BURN-${key}-${c.id}`,
          type: "SUPPLY_BURNED",
          projectKey: key as ProjectKey,
          projectId: s.projects[key as ProjectKey].projectId,
          wallet: c.wallet,
          timestamp: c.timestamp,
          displayValues: {
            summary: `销毁 ${displayAmount(burn)} ${s.projects[key as ProjectKey].symbol}`,
          },
        });
    }
  }
  return chronological([...events, ...liquidity, ...burns]);
}
export function creatorRevenueHistory(
  s: Pick<SimulationData, "operatingBooks" | "activities">,
  key: ProjectKey,
) {
  const rows = s.activities
    .filter(
      (a) =>
        a.projectKey === key &&
        ["BUY", "SELL"].includes(a.type) &&
        a.displayValues.fee,
    )
    .map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      kind: "曲线费用",
      amount: recordedAmount(a, "fee") / 2n,
      asset: "USDT",
    }));
  const cumulative: Record<string, bigint> = {};
  for (const c of s.operatingBooks[key]?.claims ?? []) {
    const previous = cumulative[c.wallet] ?? 0n,
      total = previous + BigInt(c.gross);
    cumulative[c.wallet] = total;
    rows.push({
      id: c.id,
      timestamp: c.timestamp,
      kind: "运行阶段收入",
      amount: (total * 7125n) / 100000n - (previous * 7125n) / 100000n,
      asset: "TOKEN",
    });
  }
  return rows.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
export function publicResultTrend(
  book: OperatingBook | undefined,
  metric: "pol" | "liquidity" | "burned",
) {
  const days = new Map<string, bigint>();
  for (const r of book?.publicResults ?? [])
    if (r[metric] !== null)
      days.set(r.timestamp.slice(0, 10), BigInt(r[metric]!));
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, value }));
}
// Charts cover recorded demo actions only. Never manufacture earlier background history.
export function activityTrend(
  events: Activity[],
  kind: "volume" | "participants" | "positions" | "stake" | "claims",
) {
  const groups = new Map<string, { value: bigint; wallets: Set<string> }>();
  const seen = new Set<string>();
  for (const a of [...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  )) {
    if (
      kind !== "participants" &&
      !a.displayValues[
        kind === "volume" && a.type === "SELL" ? "received" : "amount"
      ]
    )
      continue;
    const day = a.timestamp.slice(0, 10),
      row = groups.get(day) ?? { value: 0n, wallets: new Set<string>() };
    if (kind === "volume" && ["BUY", "SELL"].includes(a.type))
      row.value +=
        a.type === "BUY"
          ? recordedAmount(a, "amount")
          : recordedAmount(a, "received") + recordedAmount(a, "fee");
    if (
      kind === "participants" &&
      ["BUY", "PARTICIPATE"].includes(a.type) &&
      !seen.has(a.wallet)
    ) {
      seen.add(a.wallet);
      row.value += UNIT;
    }
    if (kind === "positions" && a.type === "PARTICIPATE")
      row.value += recordedAmount(a, "amount");
    if (kind === "stake" && ["STAKE", "UNSTAKE"].includes(a.type))
      row.value +=
        recordedAmount(a, "amount") * (a.type === "STAKE" ? 1n : -1n);
    if (kind === "claims" && a.type === "CLAIM")
      row.value += recordedAmount(a, "amount");
    const relevant =
      kind === "volume"
        ? ["BUY", "SELL"]
        : kind === "participants"
          ? ["BUY", "PARTICIPATE"]
          : kind === "positions"
            ? ["PARTICIPATE"]
            : kind === "stake"
              ? ["STAKE", "UNSTAKE"]
              : ["CLAIM"];
    if (relevant.includes(a.type)) groups.set(day, row);
  }
  return [...groups.entries()].map(([day, v]) => ({ day, value: v.value }));
}
