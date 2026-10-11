import { UNIT } from "./amount";
import {
  activePrincipal,
  contributions,
  coverage,
  remainingCapacity,
  tier,
  validPrices,
} from "./operating";
import type {
  OperatingBook,
  ProtocolMember,
  SettlementRecord,
} from "./operating-models";
export const MAX_SUPPLY = 1000000000n * UNIT;
interface Candidate {
  wallet: string;
  lotId: string;
  kind: "participation" | "network";
  value: bigint;
  price: bigint;
  quantity: bigint;
}
export function settleOperatingDay(book: OperatingBook): {
  book: OperatingBook;
  record: SettlementRecord;
  completedLots: string[];
} {
  if (book.settlements.some((s) => s.day === book.day))
    throw new Error("该日已经结算");
  const members = structuredClone(book.members);
  const frames = Array.from({ length: 24 }, (_, hour) => {
    const snapshot = [...book.snapshots].reverse().find((s) => s.hour <= hour);
    return snapshot ?? { hour, members: {}, prices: book.prices };
  });
  const candidates: Candidate[] = [];
  const reserved = new Map<string, bigint>();
  const candidate = (
    wallet: string,
    lotId: string,
    kind: Candidate["kind"],
    value: bigint,
    price: bigint,
  ) => {
    const lot = members[wallet]?.lots.find((l) => l.id === lotId);
    if (!lot) return 0n;
    const left = remainingCapacity(lot) - (reserved.get(lotId) ?? 0n);
    const accepted = value < left ? value : left;
    if (accepted <= 0n) return 0n;
    const quantity = (accepted * UNIT) / price;
    reserved.set(lotId, (reserved.get(lotId) ?? 0n) + accepted);
    candidates.push({ wallet, lotId, kind, value: accepted, price, quantity });
    return accepted;
  };
  const participationIntegral = new Map<string, bigint>();
  let totalContribution = 0n,
    totalParticipation = 0n;
  for (const frame of frames) {
    const prices = validPrices(frame.prices);
    if (!prices) continue;
    const graph = contributions(frame.members, prices.stake);
    for (const member of Object.values(frame.members)) {
      const principal = activePrincipal(member);
      const rate = BigInt(
        tier(coverage(principal, BigInt(member.staked), prices.stake)).rateBps,
      );
      for (const lot of member.lots.filter((l) => l.status === "ACTIVE")) {
        const previous = participationIntegral.get(lot.id) ?? 0n;
        const integral = previous + BigInt(lot.principal) * rate;
        participationIntegral.set(lot.id, integral);
        const value = integral / 240000n - previous / 240000n;
        totalParticipation += value;
        candidate(member.wallet, lot.id, "participation", value, prices.reward);
      }
      const c = graph[member.wallet];
      if (c?.eligible) {
        totalContribution += c.value;
      }
    }
  }
  if (totalContribution > 0n && totalParticipation > 0n) {
    const allocatedIntegral = new Map<string, bigint>();
    for (const frame of frames) {
      const prices = validPrices(frame.prices);
      if (!prices) continue;
      const graph = contributions(frame.members, prices.stake);
      for (const member of Object.values(frame.members)) {
        const c = graph[member.wallet];
        if (!c?.eligible || c.value <= 0n) continue;
        const previous = allocatedIntegral.get(member.wallet) ?? 0n;
        const integral = previous + c.value;
        allocatedIntegral.set(member.wallet, integral);
        let value =
          (totalParticipation * integral) / totalContribution -
          (totalParticipation * previous) / totalContribution;
        const lots = member.lots
          .filter((l) => l.status === "ACTIVE")
          .sort(
            (a, b) =>
              a.createdAt.localeCompare(b.createdAt) ||
              a.id.localeCompare(b.id),
          );
        for (const lot of lots) {
          const accepted = candidate(
            member.wallet,
            lot.id,
            "network",
            value,
            prices.reward,
          );
          value -= accepted;
          if (value <= 0n) break;
        }
      }
    }
  }
  const grouped = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = `${c.wallet}:${c.lotId}:${c.kind}:${c.price}`;
    const prior = grouped.get(key);
    if (prior) {
      prior.value += c.value;
      prior.quantity = (prior.value * UNIT) / prior.price;
    } else grouped.set(key, { ...c });
  }
  const requests = [...grouped.values()];
  const demand = requests.reduce((sum, c) => sum + c.quantity, 0n);
  const mintedBefore = BigInt(book.lifetimeMinted);
  const dailyLimit = (MAX_SUPPLY - mintedBefore) / 2000n;
  const scale = demand > dailyLimit ? dailyLimit : demand;
  const outcomes: Record<
    string,
    { gross: string; participation: string; network: string; value: string }
  > = {};
  let minted = 0n,
    grossValue = 0n,
    participation = 0n,
    network = 0n;
  const completedLots: string[] = [];
  const end = `${book.day}T23:59:59.000Z`;
  for (const c of requests) {
    const quantity = demand > 0n ? (c.quantity * scale) / demand : 0n;
    const value = (quantity * c.price) / UNIT;
    if (quantity === 0n) continue;
    const member = members[c.wallet];
    const lot = member.lots.find((l) => l.id === c.lotId)!;
    lot.used = (BigInt(lot.used) + value).toString();
    lot.settledGross = (BigInt(lot.settledGross) + quantity).toString();
    member.claimable = (BigInt(member.claimable) + quantity).toString();
    member.lifetimeEarned = (
      BigInt(member.lifetimeEarned) + quantity
    ).toString();
    const earned =
      c.kind === "participation" ? "participationEarned" : "networkEarned";
    member[earned] = (BigInt(member[earned]) + quantity).toString();
    const out = outcomes[c.wallet] ?? {
      gross: "0",
      participation: "0",
      network: "0",
      value: "0",
    };
    out.gross = (BigInt(out.gross) + quantity).toString();
    out[c.kind] = (BigInt(out[c.kind]) + quantity).toString();
    out.value = (BigInt(out.value) + value).toString();
    outcomes[c.wallet] = out;
    minted += quantity;
    grossValue += value;
    if (c.kind === "participation") participation += quantity;
    else network += quantity;
  }
  for (const member of Object.values(members))
    for (const lot of member.lots)
      if (lot.status === "ACTIVE" && remainingCapacity(lot) <= 0n) {
        lot.status = "COMPLETED";
        lot.completedAt = end;
        completedLots.push(lot.id);
      }
  const nextDay = new Date(Date.parse(`${book.day}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  const record: SettlementRecord = {
    day: book.day,
    completedAt: end,
    gross: minted.toString(),
    participation: participation.toString(),
    network: network.toString(),
    grossValue: grossValue.toString(),
    minted: minted.toString(),
    dailyLimit: dailyLimit.toString(),
    members: outcomes,
    status: minted > 0n ? "FINALIZED" : "NO_REWARD",
  };
  const next = {
    ...book,
    members,
    day: nextDay,
    hour: 0,
    displayStartedAt: new Date().toISOString(),
    snapshots: [
      {
        hour: 0,
        members: structuredClone(members),
        prices: structuredClone(book.prices),
      },
    ],
    settlements: [record, ...book.settlements],
    lifetimeMinted: (mintedBefore + minted).toString(),
    revision: book.revision + 1,
  };
  return { book: next, record, completedLots };
}
export function emptyMember(
  wallet: ProtocolMember["wallet"],
  sponsor: ProtocolMember["sponsor"] = null,
): ProtocolMember {
  return {
    wallet,
    sponsor,
    bound: false,
    staked: "0",
    lots: [],
    claimable: "0",
    lifetimeEarned: "0",
    lifetimeClaimed: "0",
    participationEarned: "0",
    networkEarned: "0",
  };
}
