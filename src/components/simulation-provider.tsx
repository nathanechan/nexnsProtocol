"use client";
import { useEffect } from "react";
import {
  simulationStore,
  persistSnapshot,
  STORAGE_KEY,
} from "../simulation/store";
export function SimulationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let remote = false;
    const index = () => {
      const ids = Object.values(simulationStore.getState().projects)
        .filter((p) => p.projectId.startsWith("NX-DEMO-"))
        .map((p) => `${p.chainId}:${p.tokenContract}`);
      document.cookie = `nexus-demo-projects=${encodeURIComponent(JSON.stringify(ids))}; Path=/; SameSite=Lax; Max-Age=31536000`;
    };
    try {
      simulationStore.getState().hydrate(localStorage);
      simulationStore.getState().refreshVolumes();
      simulationStore.getState().advanceMarket();
      index();
      persistSnapshot(simulationStore.getState(), localStorage);
    } catch {
      simulationStore.setState({ hydrated: true });
    }
    const stop = simulationStore.subscribe((state, previous) => {
      if (state === previous || remote) return;
      try {
        if (!state.liveMarket) simulationStore.getState().advanceMarket();
        index();
        persistSnapshot(simulationStore.getState(), localStorage);
      } catch {
        /* Storage restrictions leave the in-memory demo usable. */
      }
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      remote = true;
      try {
        if (e.newValue) simulationStore.getState().hydrate(localStorage);
        else simulationStore.getState().reset();
        index();
      } finally {
        remote = false;
      }
    };
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(() => {
      simulationStore.getState().advanceMarket();
      simulationStore.getState().refreshVolumes();
    }, 30000);
    const resume = () => {
      if (document.visibilityState === "visible")
        simulationStore.getState().advanceMarket();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      stop();
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return children;
}
