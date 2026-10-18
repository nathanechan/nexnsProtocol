import { describe, it, expect } from "vitest";
import { createSimulationStore, persistSnapshot } from "../simulation/store";
import {
  ledgerState,
  validateCurve,
  RESERVE_TARGET,
} from "../domain/economics/curve";
describe("independent market activity", () => {
  it("updates real Curve quotes without moving the user's money or protocol entitlements", () => {
    const store = createSimulationStore(),
      before = store.getState();
    const balances = structuredClone(before.exactBalances),
      books = structuredClone(before.operatingBooks),
      user = structuredClone(before.currentUser);
    const at = Date.now();
    store.getState().advanceActivity(at);
    const first = store.getState();
    expect(first.revision).toBeGreaterThan(before.revision);
    expect(first.activities.some((a) => a.id.startsWith("FLOW-"))).toBe(true);
    store.getState().advanceActivity(at);
    expect(store.getState()).toBe(first);
    for (let i = 1; i < 30; i++)
      store.getState().advanceActivity(at + i * 8000);
    const after = store.getState();
    expect(after.exactBalances).toEqual(balances);
    expect(after.currentUser).toEqual(user);
    expect(after.operatingBooks).toEqual(books);
    for (const ledger of Object.values(after.curves)) {
      validateCurve(ledgerState(ledger));
      expect(BigInt(ledger.reserve)).toBeLessThanOrEqual(RESERVE_TARGET);
      if (ledger.marketActor) {
        expect(BigInt(ledger.marketActor.usdt)).toBeGreaterThanOrEqual(0n);
        expect(BigInt(ledger.marketActor.tokens)).toBeGreaterThanOrEqual(0n);
      }
    }
    expect(
      after.activities.filter((a) => a.id.startsWith("FLOW-")).length,
    ).toBeLessThanOrEqual(384);
  });
  it("restores actor inventory with the normal persisted snapshot", () => {
    const a = createSimulationStore();
    a.getState().advanceActivity(Date.now());
    const values = new Map<string, string>();
    const storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    } as Storage;
    persistSnapshot(a.getState(), storage);
    const b = createSimulationStore();
    b.getState().hydrate(storage);
    expect(b.getState().curves).toEqual(a.getState().curves);
  });
});
