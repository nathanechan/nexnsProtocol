import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/visual-direction-01";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const check = (label, value) => {
  assert(value, label);
  checks.push(label);
};
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    let selectedContract;
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const view of ["launch", "operating"]) {
        await page.goto(
          `http://localhost:3000/visual-preview${view === "operating" ? "?view=operating" : ""}`,
        );
        await page
          .locator(view === "launch" ? ".market-row" : ".staking-chart svg")
          .first()
          .waitFor();
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        check(
          `${view} ${locale} ${width} no overflow`,
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        if (view === "launch") {
          await page.locator(".header-price button").click();
          await page.waitForURL(
            (u) =>
              u.pathname === "/visual-preview" &&
              u.searchParams.get("sort") === "price",
          );
          check(
            "preview sorting stays in preview",
            (await page.locator(".visual-lab").count()) === 1,
          );
          await page.locator(".watch-star").first().click();
          check(
            "star interaction",
            (await page.locator('.watch-star[aria-pressed="true"]').count()) >
              0,
          );
          await page.locator(".watch-star").first().click();
        } else {
          selectedContract = await page
            .locator(".direction-project-picker select")
            .inputValue();
          const chart = page.locator(".staking-chart svg");
          await chart.focus();
          await page.keyboard.press("ArrowLeft");
          check(
            "chart keyboard interaction",
            (await chart.getAttribute("data-inspected-index")) != null,
          );
          await page
            .getByRole("tab", {
              name: locale === "en" ? "Stake" : "质押",
              exact: true,
            })
            .first()
            .click();
          check(
            "stake tab selected",
            (await page
              .getByRole("tab", {
                name: locale === "en" ? "Stake" : "质押",
                exact: true,
              })
              .first()
              .getAttribute("aria-selected")) === "true",
          );
          await page
            .getByRole("tab", {
              name: locale === "en" ? "Participate" : "参与",
              exact: true,
            })
            .first()
            .click();
        }
        await page.evaluate(() => {
          document.activeElement?.blur();
          window.scrollTo(0, 0);
        });
        if ([1440, 390].includes(width)) {
          await page.screenshot({
            path: `${out}/${view}-${width}-${locale}.png`,
            fullPage: false,
          });
          await page.screenshot({
            path: `${out}/${view}-${width}-${locale}-full.png`,
            fullPage: true,
          });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:3000/economy/56/${selectedContract}`);
    await page.locator(".staking-chart svg").waitFor();
    check(
      "normal terminal remains unscoped",
      (await page.locator(".visual-lab").count()) === 0,
    );
    await page.screenshot({
      path: `${out}/before-operating-1440-${locale}.png`,
    });
    await page.goto("http://localhost:3000/launch");
    await page.locator(".market-row").first().waitFor();
    check(
      "normal launch remains unscoped",
      (await page.locator(".visual-lab").count()) === 0,
    );
    check(
      "normal launch keeps existing rows",
      (await page.locator(".market-row").count()) > 0,
    );
    await page.screenshot({
      path: `${out}/before-launch-1440-${locale}.png`,
      fullPage: false,
    });
    await context.close();
  }
  check("no browser errors", errors.length === 0);
  console.log(JSON.stringify({ checks: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
