import React from "react";
import {
  render,
  screen,
  fireEvent,
  within,
  cleanup,
  act,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProjectShell } from "../components/project-shell";
import { LocaleProvider } from "../i18n/locale";
import {
  localizedProject,
  projectName,
  projectDescription,
} from "../product/metadata";
import { mockProjects } from "../data/mock";
import {
  simulationStore,
  createSimulationStore,
  persistSnapshot,
} from "../simulation/store";
import { validateIdentity } from "../domain/create";
import { projectKey } from "../domain/identity";
import { searchProjects } from "../data/search";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/launch",
}));
vi.mock("../components/curve-chart", () => ({
  CurveChart: () => <figure>Curve derived chart</figure>,
}));
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  localStorage.clear();
  simulationStore.getState().reset();
});
afterEach(cleanup);
const show = (index: number, locale: "zh-CN" | "en" = "en") =>
  render(
    <LocaleProvider initialLocale={locale}>
      <ProjectShell initialProject={mockProjects[index]} />
    </LocaleProvider>,
  );
describe("brand metadata", () => {
  it("stores creator-entered name and description verbatim across locales and persistence", () => {
    const s = createSimulationStore();
    const name = "  澄海 Atlas  ",
      description = "  原文 description\nSecond line  ";
    const key = s.getState().createProject({
      name,
      description,
      symbol: "SEA",
      logo: "S",
      links: [],
    });
    const p = s.getState().projects[key];
    for (const locale of ["zh-CN", "en"] as const) {
      expect(projectName(p, locale)).toBe(name);
      expect(projectDescription(p, locale)).toBe(description);
    }
    persistSnapshot(s.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(restored.getState().projects[key].name).toBe(name);
    expect(restored.getState().projects[key].description).toBe(description);
  });

  it("preserves original brand content across UI languages", () => {
    const p = {
      ...mockProjects[0],
      name: "Original",
      nameZh: "中文品牌",
      nameEn: "GlobalBrand",
      description: "Original text",
      descriptionZh: "中文说明",
      descriptionEn: "English text",
    };
    expect(projectName(p, "en")).toBe("Original");
    expect(projectName(p, "zh-CN")).toBe("Original");
    expect(projectDescription(p, "en")).toBe("Original text");
    expect(projectName({ ...p, nameEn: "" }, "en")).toBe("Original");
    expect(projectDescription({ ...p, descriptionEn: undefined }, "en")).toBe(
      "Original text",
    );
    expect(localizedProject(p, "en").tokenContract).toBe(p.tokenContract);
    expect(p.name).toBe("Original");
  });
  it("accepts either name with optional descriptions and persists metadata without changing identity", () => {
    const input = {
      name: "",
      nameZh: "中文项目",
      nameEn: "Atlas Prime",
      symbol: "ATL",
      description: "",
      descriptionZh: "中文简介",
      descriptionEn: "English description",
      logo: "A",
      links: [],
    };
    expect(validateIdentity(input)).toEqual({});
    expect(
      validateIdentity({ ...input, nameZh: "", nameEn: "" }).name,
    ).toBeDefined();
    expect(
      validateIdentity({ ...input, nameEn: "x".repeat(65) }).name,
    ).toBeDefined();
    expect(
      validateIdentity({ ...input, descriptionEn: "x".repeat(2049) })
        .description,
    ).toBeDefined();
    const store = createSimulationStore();
    const key = store.getState().createProject(input);
    const p = store.getState().projects[key];
    expect(p.nameZh).toBe("中文项目");
    expect(p.nameEn).toBe("Atlas Prime");
    expect(p.descriptionEn).toBe("English description");
    expect(searchProjects([p], "Atlas Prime")[0].match).toBe("NAME");
    expect(searchProjects([p], "中文项目")[0].match).toBe("NAME");
    persistSnapshot(store.getState(), localStorage);
    const restored = createSimulationStore();
    restored.getState().hydrate(localStorage);
    expect(restored.getState().projects[key]).toEqual(p);
    expect(restored.getState().exactBalances).toEqual(
      store.getState().exactBalances,
    );
  });
});
describe("token terminal", () => {
  it("opens Positions and switches the market selector to Live after in-place migration", async () => {
    show(0);
    act(() =>
      simulationStore
        .getState()
        .seedScenario(
          projectKey(mockProjects[0].chainId, mockProjects[0].tokenContract),
          "operating",
        ),
    );
    expect(
      screen
        .getByRole("tab", { name: "Positions" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    const selector = screen.getByLabelText("Token switcher");
    expect(
      within(selector)
        .getByRole("tab", { name: "Live" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(document.querySelector(".terminal-history")).toBeNull();
    await waitFor(() =>
      expect(document.querySelectorAll(".switcher-row").length).toBeGreaterThan(
        0,
      ),
    );
  });
  it("keeps explicit secondary deep links when hydration changes lifecycle", () => {
    window.history.replaceState({}, "", "/?tab=rewards");
    show(0);
    act(() =>
      simulationStore
        .getState()
        .seedScenario(
          projectKey(mockProjects[0].chainId, mockProjects[0].tokenContract),
          "operating",
        ),
    );
    expect(
      screen
        .getByRole("tab", { name: "Rewards" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("opens the Positions detail from Portfolio canonical links", () => {
    window.history.replaceState({}, "", "/?tab=positions");
    show(3);
    expect(
      screen
        .getByRole("tab", { name: "Positions" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
  it("exposes Studio in the newly created project context", () => {
    const key = simulationStore.getState().createProject({
      name: "Creator",
      symbol: "CRTR",
      description: "",
      logo: "C",
      links: [],
    });
    const project = simulationStore.getState().projects[key];
    render(
      <LocaleProvider initialLocale="en">
        <ProjectShell initialProject={project} />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Manage" }).getAttribute("href"),
    ).toBe(`/studio/${project.projectId}`);
  });
  it("Curve preserves chart, Buy/Sell, holdings and identity in one shell", () => {
    show(0);
    expect(document.querySelector(".terminal-layout")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Velqen",
    );
    expect(screen.getByRole("tab", { name: "Buy" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Sell" })).toBeDefined();
    expect(screen.getByText("Curve derived chart")).toBeDefined();
  });
  it("Operating keeps exactly three action tabs and no executable DEX controls", () => {
    show(3);
    const tabs = screen.getByRole("tablist", { name: "Terminal actions" });
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["Participate", "Stake", "Claim"]);
    expect(
      screen
        .getByRole("button", { name: "Trade on DEX ↗" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(document.querySelector(".terminal-header")?.textContent).not.toMatch(
      /Price valid|Operating|Migration completed/,
    );
    expect(document.querySelector(".terminal-history")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Transparency" }));
    expect(document.querySelector(".terminal-history")).not.toBeNull();
    fireEvent.click(within(tabs).getByRole("tab", { name: "Claim" }));
    expect(screen.getByLabelText("Claim amount · SEA")).toBeDefined();
    expect(
      document.querySelector(".terminal-user-state")?.textContent,
    ).toContain("Claimable");
  });
  it.each([1, 2])(
    "migration %s preserves shell and has no execution actions",
    (index) => {
      show(index);
      expect(document.querySelector(".terminal-migration")).toBeDefined();
      expect(screen.queryByRole("tab", { name: "Buy" })).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: /Force migration|Execute migration|Confirm participate/,
        }),
      ).toBeNull();
    },
  );
  it("quick-switch search triggers the existing global modal entry", async () => {
    show(0);
    const listen = vi.fn();
    window.addEventListener("nexns-open-search", listen);
    fireEvent.click(
      within(screen.getByLabelText("Token switcher")).getByRole("button", {
        name: "Search",
      }),
    );
    expect(listen).toHaveBeenCalledTimes(1);
    window.removeEventListener("nexns-open-search", listen);
    await waitFor(() =>
      expect(document.querySelectorAll(".switcher-row").length).toBeGreaterThan(
        0,
      ),
    );
  });
});
