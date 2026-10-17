import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/foundation-step2";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const check = (label, value) => {
  assert(value, label);
  checks.push(label);
};
try {
  for (const locale of ["zh-CN", "en"]) {
    const zh = locale === "zh-CN";
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [1440, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3000/visual-preview/components");
      await page
        .getByRole("heading", {
          name: zh ? "基础控件与状态" : "Controls & states",
        })
        .waitFor();
      check(
        `${locale} ${width} overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width <= 768)
        check(
          "mobile keeps compact header",
          !(await page.locator(".desktop-create").isVisible()),
        );
      const feedback = page.getByRole("button", {
        name: zh ? "预览处理反馈" : "Preview feedback",
      });
      await feedback.click();
      const processing = page.getByRole("button", {
        name: zh ? "处理中…" : "Processing…",
      });
      check(
        "pending prevents double submission",
        await processing.isDisabled(),
      );
      check(
        "pending announced",
        (await processing.getAttribute("aria-busy")) === "true",
      );
      await page
        .getByRole("status")
        .filter({ hasText: zh ? "操作完成" : "Complete" })
        .waitFor();
      check("completion restores control", await feedback.isEnabled());
      await page
        .getByRole("button", {
          name: zh ? "切换校验状态" : "Toggle validation",
        })
        .click();
      check(
        "invalid field associated with error",
        (await page
          .locator("#foundation-amount")
          .getAttribute("aria-invalid")) === "true" &&
          (await page.locator("#foundation-error").getAttribute("role")) ===
            "alert",
      );
      await page.locator("#foundation-amount").focus();
      check(
        "invalid focus remains visible",
        await page
          .locator("#foundation-amount")
          .evaluate((e) => getComputedStyle(e).boxShadow !== "none"),
      );
      check(
        "disabled input",
        await page.locator("#foundation-disabled").isDisabled(),
      );
      await page
        .getByRole("combobox", { name: zh ? "选择项目" : "Select project" })
        .selectOption("second");
      check(
        "select works",
        (await page
          .getByRole("combobox", { name: zh ? "选择项目" : "Select project" })
          .inputValue()) === "second",
      );
      await page.getByRole("tab", { name: zh ? "概览" : "Overview" }).focus();
      await page.keyboard.press("ArrowRight");
      check(
        "tab keyboard navigation",
        (await page
          .getByRole("tab", { name: zh ? "记录" : "History" })
          .getAttribute("aria-selected")) === "true",
      );
      const trigger = page.getByRole("button", {
        name: zh ? "打开弹窗" : "Open dialog",
      });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      check(
        "dialog viewport fit",
        await dialog.evaluate((e) => {
          const b = e.getBoundingClientRect();
          return (
            b.x >= 0 &&
            b.right <= innerWidth &&
            b.y >= 0 &&
            b.bottom <= innerHeight
          );
        }),
      );
      check(
        "modal layer above navigation",
        await page
          .locator(".dialog-overlay")
          .evaluate((e) => Number(getComputedStyle(e).zIndex) > 100),
      );
      check(
        "focus contained",
        await dialog.evaluate((e) => e.contains(document.activeElement)),
      );
      if ([1440, 390].includes(width))
        await page.screenshot({ path: `${out}/dialog-${width}-${locale}.png` });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(
        (label) => document.activeElement?.textContent === label,
        zh ? "打开弹窗" : "Open dialog",
      );
      check(
        "focus restored",
        await trigger.evaluate((e) => document.activeElement === e),
      );
      await trigger.click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: zh ? "确认" : "Confirm", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      check("confirmation dismisses preview", (await dialog.count()) === 0);
      check(
        "reduced motion",
        await page
          .locator(".button")
          .first()
          .evaluate((e) => getComputedStyle(e).transitionDuration === "0s"),
      );
      await page.evaluate(() => {
        document.activeElement?.blur();
        scrollTo(0, 0);
      });
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: `${out}/controls-${width}-${locale}.png`,
          fullPage: true,
        });
    }
    await context.close();
  }
  check("no browser errors", errors.length === 0);
  console.log(JSON.stringify({ checks: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
