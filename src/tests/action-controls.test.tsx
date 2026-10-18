import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AmountPresets, ActionFeedback } from "../components/action-controls";
import { LocaleProvider } from "../i18n/locale";
import { UNIT } from "../domain/economics/amount";
afterEach(cleanup);
describe("amount shortcuts", () => {
  it("never offers a cash amount above the available balance", () => {
    const select = vi.fn();
    render(
      <LocaleProvider initialLocale="en">
        <AmountPresets
          available={99n * UNIT}
          currency
          disabled={false}
          onSelect={select}
        />
      </LocaleProvider>,
    );
    expect(
      (screen.getByRole("button", { name: "100 USDT" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "25 USDT" }));
    expect(select).toHaveBeenCalledWith("25");
  });
  it("uses exact available token units and rounds down, including dust", () => {
    const select = vi.fn();
    const view = render(
      <LocaleProvider initialLocale="en">
        <AmountPresets
          available={7n}
          currency={false}
          disabled={false}
          onSelect={select}
        />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "75%" }));
    expect(select).toHaveBeenCalledWith("0.000000000000000005");
    view.rerender(
      <LocaleProvider initialLocale="en">
        <AmountPresets
          available={1n}
          currency={false}
          disabled={false}
          onSelect={select}
        />
      </LocaleProvider>,
    );
    expect(
      (screen.getByRole("button", { name: "25%" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("disables every preset during processing", () => {
    render(
      <LocaleProvider initialLocale="en">
        <AmountPresets
          available={1000n * UNIT}
          currency
          disabled
          onSelect={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(
      screen
        .getAllByRole("button")
        .every((b) => (b as HTMLButtonElement).disabled),
    ).toBe(true);
  });
});
describe("action result feedback", () => {
  it("localizes retained success feedback to the current language", () => {
    render(
      <LocaleProvider initialLocale="zh-CN">
        <ActionFeedback
          message="Claim complete · Received 12.345678 SEA"
          pending={false}
          success
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "领取成功 · 实际到账 12.345678 SEA",
    );
  });
  it("announces final results and removes the visual container when empty", () => {
    const view = render(
      <LocaleProvider initialLocale="en">
        <ActionFeedback
          message="Stake complete · Staked 10 FIELD"
          pending={false}
          success
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole("status").textContent).toContain("10 FIELD");
    expect(view.container.querySelector(".operation-success")).toBeTruthy();
    view.rerender(
      <LocaleProvider initialLocale="en">
        <ActionFeedback message="" pending={false} success={false} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("status").children).toHaveLength(0);
  });
});
