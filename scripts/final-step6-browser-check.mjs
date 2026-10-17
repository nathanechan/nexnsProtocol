import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/final-step6";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [768, 1024],
      [844, 390],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      for (const route of [
        "/launch",
        "/live",
        "/portfolio",
        "/create",
        "/protocol",
        "/nexns",
        "/studio/NX-0001",
        "/economy/56/0x000000000000000000000000000000000003fc24",
        "/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
      ]) {
        await page.goto(base + route);
        await page.locator("h1").waitFor();
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
        assert.equal(await page.locator("h1").count(), 1);
        const input = page.locator("main input.input:visible").first();
        if (width <= 768 && (await input.count()))
          assert(
            parseFloat(
              await input.evaluate((e) => getComputedStyle(e).fontSize),
            ) >= 16,
          );
        checks.push(`${locale} ${width}x${height} ${route} layout`);
      }
      await page
        .getByRole("button", {
          name: locale === "en" ? "Search" : "搜索",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      const box = await dialog.boundingBox();
      assert(box.y >= 0 && box.y + box.height <= height + 1);
      const search = dialog.getByRole("searchbox");
      await search.fill("NEXNS");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      checks.push(
        `${locale} ${width}x${height} search dialog bounds and Escape`,
      );
      await page.goto(base + "/create");
      const next = page.locator(".wizard-actions button").last();
      await next.focus();
      if (width <= 768) {
        const rect = await next.boundingBox();
        const nav = await page.locator(".mobile-primary").boundingBox();
        assert(
          rect.y >= 0 && rect.y + rect.height <= nav.y,
          "focused action clears bottom navigation",
        );
      }
      assert.equal(
        await next.evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      checks.push(
        `${locale} ${width}x${height} keyboard focus and reduced motion`,
      );
      await page.screenshot({
        path: `${out}/${locale}-${width}x${height}-focus.png`,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: checks.length, errors }));
} finally {
  await browser.close();
}
