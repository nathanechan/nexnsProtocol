import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/pages-v2";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [];
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/launch",
        "/live",
        "/markets",
        "/portfolio",
        "/create",
        "/protocol",
        "/studio/NX-0001",
        "/nexns",
        "/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
      ]) {
        await page.goto("http://localhost:3000" + route);
        await page.locator('main [data-nexns-ui="v2"]').waitFor();
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${locale} ${width} ${route}`,
        );
        checks++;
        assert.equal(
          await page
            .locator("body")
            .evaluate((e) =>
              getComputedStyle(e).getPropertyValue("--nexns-accent").trim(),
            ),
          "#2464eb",
        );
        checks++;
        if (width === 1440 || width === 390) {
          await page.screenshot({
            path: `${out}/${locale}-${width}-${route.split("/")[1]}.png`,
            fullPage: !["/launch", "/live", "/markets"].includes(route),
          });
        }
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
