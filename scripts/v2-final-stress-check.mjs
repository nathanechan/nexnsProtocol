import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v2-final";
fs.mkdirSync(out, { recursive: true });
const name = "NEXNSLONGNAME".repeat(5).slice(0, 64),
  symbol = "ABCDEFGHIJKL";
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
    const routes = [];
    for (let i = 0; i < 2; i++) {
      await page.goto("http://localhost:3000/create");
      await page
        .locator('.identity-fields input:not([type="file"])')
        .nth(0)
        .fill(name);
      await page
        .locator('.identity-fields input:not([type="file"])')
        .nth(1)
        .fill(symbol);
      await page.locator(".identity-fields textarea").fill("A".repeat(1024));
      await page.locator(".wizard-actions button").last().click();
      await page.locator(".wizard-actions button").last().click();
      await page.locator(".wizard-actions button").last().click();
      await page.waitForURL("**/economy/56/0xe*");
      routes.push(page.url());
    }
    assert.notEqual(routes[0], routes[1]);
    checks++;
    const contract = routes[0].split("/").at(-1);
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [844, 390],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      for (const target of ["terminal", "studio", "portfolio"]) {
        const url =
          target === "portfolio"
            ? "http://localhost:3000/portfolio"
            : routes[0];
        await page.goto(url);
        await page.locator("h1").waitFor();
        if (target === "studio") {
          const manage = page.locator(
            '.terminal-header-meta a[href^="/studio/"]',
          );
          await manage.click();
          await page.locator(".studio-identity").waitFor();
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${locale} ${width} ${target}`,
        );
        checks++;
      }
      await page.goto(routes[0]);
      assert.equal(
        await page.locator("h1 [data-token-symbol]").textContent(),
        symbol,
      );
      checks++;
      const field = page.locator(".terminal-actions input").first();
      await field.fill("999999999999999999999999");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      checks++;
      assert.equal(
        await page
          .locator(".terminal-actions .button.primary")
          .first()
          .isDisabled(),
        true,
      );
      checks++;
      await field.fill("10");
      await page.locator(".terminal-actions .button.primary").first().click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.equal(
        await dialog
          .locator(".financial-identity")
          .getAttribute("data-contract"),
        contract,
      );
      checks++;
      const bounds = await dialog.boundingBox();
      assert(
        bounds.x >= 0 &&
          bounds.y >= 0 &&
          bounds.x + bounds.width <= width + 1 &&
          bounds.y + bounds.height <= height + 1,
      );
      checks++;
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page
        .getByRole("button", {
          name: locale === "en" ? "Search" : "搜索",
          exact: true,
        })
        .click();
      await page.getByRole("searchbox").fill(contract);
      await page.locator(".search-result").first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      checks++;
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: locale === "en" ? "Search" : "搜索",
          exact: true,
        })
        .click();
      await page.getByRole("searchbox").fill(name);
      await page.waitForTimeout(300);
      assert(
        (await page
          .getByRole("dialog")
          .locator('a[href*="/economy/56/0xe"]')
          .count()) >= 2,
      );
      checks++;
      await page.keyboard.press("Escape");
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${out}/${locale}-${width}-long-identity.png`,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
