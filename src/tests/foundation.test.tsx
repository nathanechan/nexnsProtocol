import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockProjects } from "../data/mock";
import {
  findProject,
  normalizeAddress,
  projectKey,
  projectRoute,
  shortAddress,
} from "../domain/identity";
import { searchProjects } from "../data/search";
import { createSimulationStore } from "../simulation/store";
import { ContractAddress, LifecycleBadge } from "../components/ui";
import NotFound from "../app/not-found";
afterEach(cleanup);
describe("canonical identity", () => {
  it("uses chain and normalized contract", () => {
    expect(projectKey(56, mockProjects[0].tokenContract)).not.toBe(
      projectKey(1, mockProjects[0].tokenContract),
    );
    expect(normalizeAddress("0x" + "A".repeat(40))).toBe("0x" + "a".repeat(40));
  });
  it("duplicate names and symbols remain independent", () => {
    expect(mockProjects[0].name).toBe(mockProjects[3].name);
    expect(mockProjects[0].symbol).toBe(mockProjects[3].symbol);
    expect(projectKey(56, mockProjects[0].tokenContract)).not.toBe(
      projectKey(56, mockProjects[3].tokenContract),
    );
  });
  it("generates canonical routes", () => {
    expect(projectRoute(mockProjects[0])).toBe(
      "/economy/56/" + mockProjects[0].tokenContract,
    );
  });
  it("rejects unknown, invalid and cross-chain project routes", () => {
    expect(
      findProject(mockProjects, "1", mockProjects[0].tokenContract),
    ).toBeUndefined();
    expect(findProject(mockProjects, "56", "SEA")).toBeUndefined();
    expect(
      findProject(mockProjects, "56", "0x" + "9".repeat(40)),
    ).toBeUndefined();
    expect(
      findProject(mockProjects, "56x", mockProjects[0].tokenContract),
    ).toBeUndefined();
  });
  it("provides a not-found experience instead of demo fallback", () => {
    render(<NotFound />);
    expect(screen.getByText("未找到页面或项目")).toBeDefined();
  });
  it("shortens mobile display while preserving full copy label", () => {
    const a = mockProjects[0].tokenContract;
    expect(shortAddress(a)).toHaveLength(11);
    render(<ContractAddress address={a} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain(a);
  });
});
describe("search priority", () => {
  it("ranks exact contract above name and symbol", () => {
    const address = mockProjects[0].tokenContract;
    const fixture = { ...mockProjects[1], name: address, symbol: address };
    expect(searchProjects([fixture, mockProjects[0]], address)[0].match).toBe(
      "CONTRACT",
    );
  });
  it("matches project ID exactly", () =>
    expect(searchProjects(mockProjects, "nx-0002")[0].project.projectId).toBe(
      "NX-0002",
    ));
  it("returns duplicate symbols", () =>
    expect(
      searchProjects(mockProjects, "sea").filter((r) => r.match === "SYMBOL"),
    ).toHaveLength(2));
  it("returns duplicate names", () =>
    expect(
      searchProjects(mockProjects, "澄海").filter((r) => r.match === "NAME"),
    ).toHaveLength(2));
  it("matches creator wallets", () =>
    expect(
      searchProjects(mockProjects, mockProjects[0].creatorWallet),
    ).toHaveLength(2));
  it("handles empty queries and chain scope", () => {
    expect(searchProjects(mockProjects, "  ")).toEqual([]);
    expect(searchProjects(mockProjects, "SEA", 1)).toEqual([]);
  });
});
describe("presentation and simulation integrity", () => {
  it.each([
    ["CURVE_OPEN", "曲线发行"],
    ["MIGRATION_READY", "待迁移"],
    ["MIGRATING", "迁移中"],
    ["OPERATING", "运行中"],
  ] as const)("renders %s badge", (state, label) => {
    render(<LifecycleBadge state={state} showHealthy />);
    expect(screen.getByText(label)).toBeDefined();
  });
  it("updates one canonical project without aliasing duplicate names", () => {
    const store = createSimulationStore();
    const p = structuredClone(mockProjects[0]);
    p.description = "Updated";
    store.getState().replaceProject(p);
    p.description = "External mutation";
    expect(
      store.getState().projects[projectKey(56, p.tokenContract)].description,
    ).toBe("Updated");
    expect(
      store.getState().projects[projectKey(56, mockProjects[3].tokenContract)]
        .description,
    ).not.toBe("Updated");
    expect(store.getState().revision).toBe(1);
    store.getState().reset();
    expect(store.getState().revision).toBe(0);
  });
  it("prevents a registry ID from aliasing another contract", () => {
    const store = createSimulationStore();
    expect(() =>
      store.getState().replaceProject({
        ...mockProjects[0],
        tokenContract: mockProjects[1].tokenContract,
      }),
    ).toThrow();
  });
});
