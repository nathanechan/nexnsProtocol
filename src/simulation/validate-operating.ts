import { normalizeAddress } from "../domain/identity";
import type { ProjectKey } from "../domain/models";
import type { OperatingBook } from "../domain/economics/operating-models";
import { contributions } from "../domain/economics/operating";
import { UNIT } from "../domain/economics/amount";
import { MAX_SUPPLY } from "../domain/economics/settlement";
export function validateOperatingBook(book: OperatingBook, key: ProjectKey) {
  const value = (raw: string) => {
    if (typeof raw !== "string" || !/^\d+$/.test(raw))
      throw new Error("Invalid saved amount");
    return BigInt(raw);
  };
  if (
    book.projectIdentity !== key ||
    normalizeAddress(book.root) !== book.root ||
    !book.members[book.root] ||
    !Number.isInteger(book.hour) ||
    book.hour < 0 ||
    book.hour > 24 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(book.day)
  )
    throw new Error("Invalid saved Operating identity");
  if (
    book.presentationClock &&
    (!Number.isFinite(book.presentationClock.updatedAt) ||
      book.presentationClock.updatedAt < 0 ||
      !Number.isFinite(book.presentationClock.elapsedMs) ||
      book.presentationClock.elapsedMs < 0 ||
      book.presentationClock.elapsedMs > 60000)
  )
    throw new Error("Invalid presentation clock");
  const minted = value(book.lifetimeMinted);
  if (minted < 1000000n * UNIT || minted > MAX_SUPPLY)
    throw new Error("Invalid issuance");
  if (value(book.burned) + value(book.base.burned) > minted)
    throw new Error("Invalid burned supply");
  for (const result of book.publicResults ?? []) {
    if (!Number.isFinite(Date.parse(result.timestamp)))
      throw new Error("Invalid public result");
    for (const v of [
      result.treasury,
      result.liquidity,
      result.burned,
      result.pol,
    ])
      if (v !== null) value(v);
  }
  for (const metric of [
    book.creatorAccrued,
    book.platformAccrued,
    book.burned,
    book.claimDust ?? "0",
    ...Object.values(book.base).filter((v) => typeof v === "string"),
  ])
    value(String(metric));
  let earned = 0n;
  for (const [wallet, m] of Object.entries(book.members)) {
    if (normalizeAddress(wallet) !== wallet || m.wallet !== wallet)
      throw new Error("Invalid member");
    if (m.sponsor && (m.sponsor === wallet || !book.members[m.sponsor]))
      throw new Error("Invalid sponsor");
    value(m.staked);
    const gross = value(m.lifetimeEarned);
    if (value(m.claimable) + value(m.lifetimeClaimed) !== gross)
      throw new Error("Invalid reward balance");
    if (value(m.participationEarned) + value(m.networkEarned) !== gross)
      throw new Error("Invalid reward history");
    earned += gross;
    let lotGross = 0n;
    for (const l of m.lots) {
      if (
        l.wallet !== wallet ||
        l.projectKey !== key ||
        value(l.capacity) !== (value(l.principal) * 5n) / 2n ||
        value(l.used) > value(l.capacity)
      )
        throw new Error("Invalid lot capacity");
      if (l.status === "COMPLETED" && value(l.used) !== value(l.capacity))
        throw new Error("Invalid completed lot");
      lotGross += value(l.settledGross);
    }
    if (lotGross !== gross) throw new Error("Invalid lot reward");
  }
  if (earned > minted - 1000000n * UNIT)
    throw new Error("Invalid minted rewards");
  contributions(book.members, null);
  for (const frame of book.snapshots) {
    if (!Number.isInteger(frame.hour) || frame.hour < 0 || frame.hour > 24)
      throw new Error("Invalid snapshot");
    validateOperatingBook(
      { ...book, members: frame.members, snapshots: [] },
      key,
    );
    for (const price of [frame.prices.direct, frame.prices.indirect])
      if (price !== null) value(price);
  }
}
