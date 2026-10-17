import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
fs.mkdirSync("test-results/v2-final", { recursive: true });
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 390, 320])
      for (const [i, status, blocked] of [
        [20, "price_invalid", true],
        [24, "protected", false],
      ]) {
        const token = "0x" + (0x9a00 + i * 7919).toString(16).padStart(40, "0");
        await page.setViewportSize({ width, height: 900 });
        await page.goto("http://localhost:3000/economy/56/" + token);
        await page.locator(".terminal-flagship").waitFor();
        assert.equal(
          await page
            .locator(".terminal-header-meta .price-" + status)
            .isVisible(),
          true,
        );
        checks++;
        await page.locator(".terminal-actions input").first().fill("10");
        assert.equal(
          await page
            .locator(".terminal-actions .operation-confirm")
            .isDisabled(),
          blocked,
        );
        checks++;
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        checks++;
        if (width === 390)
          await page.screenshot({
            path: `test-results/v2-final/${locale}-${status}.png`,
            fullPage: true,
          });
      }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
