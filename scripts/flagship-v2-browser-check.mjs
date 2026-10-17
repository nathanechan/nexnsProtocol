import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/flagship-v2";
fs.mkdirSync(out, { recursive: true });
const errors = [];
let checks = 0;
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        "http://localhost:3000/economy/56/0x000000000000000000000000000000000003fc24",
      );
      await page.locator(".terminal-flagship").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      checks++;
      assert.equal(
        await page.locator(".terminal-market-strip > div").count(),
        4,
      );
      checks++;
      const actions = await page.locator(".terminal-actions").boundingBox(),
        chart = await page.locator(".terminal-chart").boundingBox(),
        metrics = await page.locator(".terminal-market-strip").boundingBox();
      if (width > 900) {
        assert(actions.x > chart.x + chart.width - 1);
        assert(metrics.y < chart.y);
      } else {
        assert(actions.y < metrics.y && actions.y < chart.y);
      }
      checks++;
      assert.equal(
        await page
          .locator('.brand .nexns-mark image[href="/brand/nexns-logo.png"]')
          .count(),
        1,
      );
      checks++;
      for (const kind of ["participate", "stake", "claim"]) {
        const name = {
          participate: locale === "en" ? "Participate" : "参与",
          stake: locale === "en" ? "Stake" : "质押",
          claim: locale === "en" ? "Claim" : "领取",
        }[kind];
        await page
          .locator(".terminal-actions > .product-tabs > .product-tablist")
          .getByRole("tab", { name, exact: true })
          .click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        checks++;
      }
      if (width === 1440 || width === 390) {
        await page
          .locator(".terminal-actions > .product-tabs > .product-tablist")
          .getByRole("tab")
          .first()
          .click();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `${out}/${locale}-${width}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
