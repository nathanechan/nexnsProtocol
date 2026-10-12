import { describe, expect, it } from "vitest";
import { createSimulationStore, persistSnapshot } from "../simulation/store";
import { projectKey } from "../domain/identity";
import { mockProjects } from "../data/mock";
import {
  stakingHistory,
  stakingWindow,
  stakeRanges,
} from "../product/staking-history";
describe("staking presentation history", () => {
  it("uses stable identity snapshots and never precedes operating lifecycle", () => {
    const p = mockProjects.find((p) => p.lifecycle === "OPERATING")!;
    const a = stakingHistory(p, []);
    expect(a).toEqual(stakingHistory(structuredClone(p), []));
    expect(a[0].time).toBeGreaterThanOrEqual(
      Date.parse(p.migration.completedAt!),
    );
    expect(a.at(-1)!.amount).toBe(p.operating!.totalStaked);
    for (const range of stakeRanges)
      expect(stakingWindow(a, range).at(-1)).toEqual(a.at(-1));
  });
  it("appends successful stake and unstake events with exact deltas and survives snapshot reload", () => {
    const store = createSimulationStore();
    const p = mockProjects.find((p) => p.lifecycle === "OPERATING")!;
    const key = projectKey(p.chainId, p.tokenContract);
    store.getState().seedOperating(key, "mid");
    store.getState().fundToken(key);
    const before = store.getState().projects[key].operating!.totalStaked;
    store.getState().stakeTokens(key, "10");
    let state = store.getState();
    const staked = stakingHistory(state.projects[key], state.activities);
    expect(staked.at(-1)!.amount).toBeCloseTo(before + 10);
    store.getState().stakeTokens(key, "4", true);
    state = store.getState();
    const unstaked = stakingHistory(state.projects[key], state.activities);
    expect(unstaked.at(-1)!.amount).toBeCloseTo(before + 6);
    expect(unstaked.length).toBe(staked.length + 1);
    expect(
      stakingHistory(
        JSON.parse(JSON.stringify(state.projects[key])),
        JSON.parse(JSON.stringify(state.activities)),
      ),
    ).toEqual(unstaked);
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    } as Storage;
    persistSnapshot(state, storage);
    const restored = createSimulationStore();
    restored.getState().hydrate(storage);
    expect(
      stakingHistory(
        restored.getState().projects[key],
        restored.getState().activities,
      ),
    ).toEqual(unstaked);
    store.setState({ failNextOperating: true });
    expect(() => store.getState().stakeTokens(key, "1")).toThrow();
    expect(
      stakingHistory(
        store.getState().projects[key],
        store.getState().activities,
      ),
    ).toEqual(unstaked);
  });
});
