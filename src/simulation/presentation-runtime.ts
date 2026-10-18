import type { SimulationState } from "./store";
import type { StoreApi } from "zustand/vanilla";
import { validPrices } from "../domain/economics/operating";
import { settleOperatingDay } from "../domain/economics/settlement";
import type { OperatingBook } from "../domain/economics/operating-models";
import type { ProjectKey } from "../domain/models";
export const PRESENTATION_DAY_MS = 60000;
export function preparePresentation(
  store: StoreApi<SimulationState>,
  now = Date.now(),
) {
  const initial = store.getState();
  const candidates = Object.entries(initial.projects)
    .filter(
      ([, p]) =>
        p.lifecycle === "OPERATING" &&
        p.priceStatus === "VALID" &&
        p.creatorWallet !== initial.currentUser.wallet,
    )
    .sort(
      (a, b) => Number(!!b[1].isPlatformToken) - Number(!!a[1].isPlatformToken),
    )
    .slice(0, 3);
  candidates.forEach(([raw], index) => {
    const key = raw as ProjectKey,
      state = store.getState(),
      book = state.operatingBooks[key],
      member = book?.members[state.currentUser.wallet];
    if (book?.presentationClock) return;
    if (!member?.lots.length) {
      if (
        book &&
        (Object.keys(book.members).some((w) => w !== book.root) ||
          book.claims.length ||
          book.settlements.length)
      )
        return;
      const asset = `${state.projects[key].chainId}:${state.projects[key].tokenContract.toLowerCase()}`;
      const prior = BigInt(state.exactBalances[asset] ?? "0");
      state.seedOperating(key, index === 1 ? "mid" : "full");
      if (index < 2) store.getState().settleDay(key);
      if (prior > BigInt(store.getState().exactBalances[asset] ?? "0"))
        store.setState((s) => ({
          exactBalances: { ...s.exactBalances, [asset]: prior.toString() },
        }));
    }
  });
  const state = store.getState(),
    books = { ...state.operatingBooks };
  for (const [key, book] of Object.entries(books)) {
    if (book.members[state.currentUser.wallet]?.lots.length) {
      books[key as ProjectKey] = {
        ...book,
        presentationClock: {
          elapsedMs: book.presentationClock?.elapsedMs ?? 0,
          updatedAt: now,
        },
      };
    }
  }
  store.setState({ operatingBooks: books });
}
export function advancePresentation(
  store: StoreApi<SimulationState>,
  now = Date.now(),
) {
  if (!Number.isFinite(now)) return;
  for (const raw of Object.keys(store.getState().operatingBooks)) {
    const key = raw as ProjectKey,
      state = store.getState(),
      book = state.operatingBooks[key];
    if (state.failNextOperating) continue;
    if (
      state.projects[key]?.lifecycle !== "OPERATING" ||
      !book.members[state.currentUser.wallet]?.lots.some(
        (l) => l.status === "ACTIVE",
      )
    )
      continue;
    if (!book.presentationClock) {
      store.setState((s) => ({
        operatingBooks: {
          ...s.operatingBooks,
          [key]: {
            ...book,
            presentationClock: { elapsedMs: 0, updatedAt: now },
          },
        },
      }));
      continue;
    }
    const clock = book.presentationClock ?? { elapsedMs: 0, updatedAt: now };
    if (now <= clock.updatedAt) continue;
    // Run only while the presentation is active; no offline reward catch-up.
    const delta = now - clock.updatedAt > 5000 ? 0 : now - clock.updatedAt;
    const elapsed = clock.elapsedMs + delta;
    const target = Math.min(
      24,
      Math.floor((elapsed / PRESENTATION_DAY_MS) * 24),
    );
    if (target > book.hour) state.advanceHours(key, target - book.hour);
    let settled = false;
    if (elapsed >= PRESENTATION_DAY_MS) {
      const current = store.getState().operatingBooks[key];
      if (current.snapshots.some((s) => validPrices(s.prices))) {
        store.getState().settleDay(key);
        settled = true;
      }
    }
    store.setState((s) => ({
      operatingBooks: {
        ...s.operatingBooks,
        [key]: {
          ...s.operatingBooks[key],
          presentationClock: {
            elapsedMs: settled ? 0 : Math.min(elapsed, PRESENTATION_DAY_MS),
            updatedAt: now,
          },
        },
      },
    }));
  }
}
export function pendingPresentationReward(book: OperatingBook, wallet: string) {
  if (!book.presentationClock || !validPrices(book.prices)) return 0n;
  try {
    const gross = BigInt(
      settleOperatingDay(book).record.members[wallet]?.gross ?? "0",
    );
    return (
      (gross *
        BigInt(
          Math.floor(
            Math.min(PRESENTATION_DAY_MS, book.presentationClock.elapsedMs),
          ),
        )) /
      BigInt(PRESENTATION_DAY_MS)
    );
  } catch {
    return 0n;
  }
}
