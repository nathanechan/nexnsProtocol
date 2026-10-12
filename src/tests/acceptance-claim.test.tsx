import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MyNexus } from "../components/my-nexus";
import { projectKey } from "../domain/identity";
import { simulationStore, balanceKey } from "../simulation/store";
import { parseAmount, decimal } from "../domain/economics/amount";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
const key = projectKey(56, "0x" + "4".repeat(40));
beforeEach(() => {
  localStorage.clear();
  simulationStore.getState().reset();
});
afterEach(cleanup);
const seed = () => simulationStore.getState().seedOperating(key, "claimable");
const openClaim = () =>
  fireEvent.click(screen.getByRole("button", { name: "领取" }));
const confirm = async () => {
  fireEvent.click(screen.getByRole("button", { name: "确认领取" }));
  fireEvent.click(screen.getByRole("button", { name: "确认操作" }));
  await waitFor(() =>
    expect(screen.getByText(/领取成功 · 实际到账/)).toBeTruthy(),
  );
};
describe("final acceptance portfolio claim UX", () => {
  it("orders the asset strip and hides Claim when nothing can be claimed", () => {
    const { container } = render(<MyNexus />);
    expect(
      [...container.querySelectorAll(".summary-strip dt")].map(
        (n) => n.textContent,
      ),
    ).toEqual(["Token资产", "仓位", "质押", "可领取", "项目"]);
    expect(
      container.querySelector(".portfolio-claimable > strong")?.textContent,
    ).toBe("可领取");
    expect(screen.getByText("当前暂无可领取资产")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "领取" })).toBeNull();
  });
  it("reuses canonical Claim and updates actual received tokens, claim history and summary immediately", async () => {
    seed();
    const before = simulationStore.getState(),
      wallet = before.currentUser.wallet;
    const member = before.operatingBooks[key].members[wallet];
    const assetKey = balanceKey(56, before.projects[key].tokenContract);
    const balance = BigInt(before.exactBalances[assetKey] ?? "0");
    const { container } = render(<MyNexus />);
    openClaim();
    fireEvent.click(screen.getByRole("button", { name: "使用全部" }));
    await confirm();
    const after = simulationStore.getState(),
      next = after.operatingBooks[key].members[wallet],
      claim = after.operatingBooks[key].claims.at(-1)!;
    expect(next.claimable).toBe("0");
    expect(BigInt(next.lifetimeClaimed) - BigInt(member.lifetimeClaimed)).toBe(
      BigInt(member.claimable),
    );
    expect(BigInt(after.exactBalances[assetKey]) - balance).toBe(
      BigInt(claim.received),
    );
    expect(screen.getByText(/领取成功 · 实际到账/).textContent).toContain(
      decimal(BigInt(claim.received)),
    );
    expect(container.querySelector(".summary-claimable dd")?.textContent).toBe(
      "0 USDT",
    );
    expect(container.querySelector(".portfolio-claim-row")).toBeNull();
    expect(screen.queryByRole("button", { name: "领取" })).toBeNull();
  });
  it("keeps the Claim row actionable after a partial claim", async () => {
    seed();
    const before = simulationStore.getState(),
      wallet = before.currentUser.wallet;
    const initial = BigInt(
      before.operatingBooks[key].members[wallet].claimable,
    );
    render(<MyNexus />);
    openClaim();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: decimal(initial / 2n) },
    });
    await confirm();
    expect(
      BigInt(
        simulationStore.getState().operatingBooks[key].members[wallet]
          .claimable,
      ),
    ).toBe(initial - parseAmount(decimal(initial / 2n)));
    expect(screen.getByRole("button", { name: "领取" })).toBeTruthy();
  });
});
