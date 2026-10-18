import { describe, it, expect } from "vitest";
import { createSimulationStore, persistSnapshot } from "../simulation/store";
import {
  preparePresentation,
  advancePresentation,
  pendingPresentationReward,
} from "../simulation/presentation-runtime";
import { validateOperatingBook } from "../simulation/validate-operating";
import { aggregateCandles } from "../product/market-candles";
describe("Presentation lifecycle", () => {
  it("provides stakable balances and claimable books without overwriting existing positions", () => {
    const store = createSimulationStore(),
      time = Date.now();
    preparePresentation(store, time);
    const state = store.getState(),
      wallet = state.currentUser.wallet;
    const books = Object.values(state.operatingBooks).filter(
      (b) => b.presentationClock,
    );
    expect(books.length).toBeGreaterThanOrEqual(3);
    expect(books.some((b) => BigInt(b.members[wallet].claimable) > 0n)).toBe(
      true,
    );
    for (const b of books) validateOperatingBook(b, b.projectIdentity);
    const lots = books.flatMap((b) => b.members[wallet].lots.map((l) => l.id));
    preparePresentation(store, time + 1000);
    expect(
      Object.values(store.getState().operatingBooks)
        .filter((b) => b.presentationClock)
        .flatMap((b) => b.members[wallet].lots.map((l) => l.id)),
    ).toEqual(lots);
  });
  it("ticks estimates, settles exactly once, claims to wallet and persists", () => {
    const store = createSimulationStore(),
      time = Date.now();
    preparePresentation(store, time);
    const wallet = store.getState().currentUser.wallet;
    const key = Object.values(store.getState().operatingBooks).find(
      (b) => b.presentationClock,
    )!.projectIdentity;
    const before = BigInt(
      store.getState().operatingBooks[key].members[wallet].claimable,
    );
    advancePresentation(store, time + 1000);
    expect(
      pendingPresentationReward(store.getState().operatingBooks[key], wallet),
    ).toBeGreaterThan(0n);
    for (let second = 2; second <= 60; second++)
      advancePresentation(store, time + second * 1000);
    const book = store.getState().operatingBooks[key];
    expect(BigInt(book.members[wallet].claimable)).toBeGreaterThan(before);
    const count = book.settlements.length;
    advancePresentation(store, time + 60000);
    expect(store.getState().operatingBooks[key].settlements).toHaveLength(
      count,
    );
    const asset = `${store.getState().projects[key].chainId}:${store.getState().projects[key].tokenContract.toLowerCase()}`;
    const balance = BigInt(store.getState().exactBalances[asset]);
    store.getState().claimReward(key, "1");
    expect(BigInt(store.getState().exactBalances[asset])).toBeGreaterThan(
      balance,
    );
    validateOperatingBook(store.getState().operatingBooks[key], key);
    persistSnapshot(store.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(restored.getState().operatingBooks[key].claims).toEqual(
      store.getState().operatingBooks[key].claims,
    );
    const old = store.getState().operatingBooks[key].settlements.length;
    advancePresentation(store, time + 3600000);
    expect(store.getState().operatingBooks[key].settlements).toHaveLength(old);
  });
  it("aggregates chronological OHLC without invented prices", () => {
    expect(
      aggregateCandles(
        [
          { time: 2000, price: 3 },
          { time: 1000, price: 2 },
          { time: 3000, price: 1 },
          { time: 60000, price: 4 },
          { time: 5000, price: NaN },
        ],
        60,
      ),
    ).toEqual([
      { time: 0, open: 2, high: 3, low: 1, close: 1 },
      { time: 60, open: 4, high: 4, low: 4, close: 4 },
    ]);
  });
});
