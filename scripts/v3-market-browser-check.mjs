import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v3-market";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [];
try {
  for (const locale of ["zh-CN", "en"])
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
      });
      await context.addInitScript((l) => {
        localStorage.setItem("nexns-locale", l);
        localStorage.setItem("nexns-theme", "dark");
      }, locale);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of ["launch", "live"]) {
        await page.goto(`http://localhost:3000/${route}`);
        await page.locator(".discovery-project-row").first().waitFor();
        for (const theme of ["dark", "light"]) {
          if ((await page.locator("html").getAttribute("data-theme")) !== theme)
            await page.locator(".theme-toggle").click();
          await page.waitForTimeout(250);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          checks++;
          assert.equal(await page.locator("[data-token-name]").count(), 0);
          checks++;
          assert.equal(
            await page.locator(".market-trend").count(),
            await page.locator(".discovery-project-row").count(),
          );
          checks++;
          assert(
            !(await page.locator("main").innerText()).match(
              /演示项目|阶段榜单|Top 100/,
            ),
          );
          checks++;
          if ([1440, 390].includes(width))
            await page.screenshot({
              path: `${out}/${locale}-${width}-${theme}-${route}.png`,
              fullPage: false,
            });
        }
        const first = page.locator(".discovery-project-row").first();
        const href = await first.getAttribute("href");
        await page.locator(".watch-star").first().click();
        assert.equal(
          await page
            .locator(".watch-star")
            .first()
            .getAttribute("aria-pressed"),
          "true",
        );
        checks++;
        await page
          .getByRole("tab", {
            name: locale === "en" ? "Watchlist" : "自选",
            exact: true,
          })
          .click();
        await page.waitForTimeout(200);
        assert(
          await page.locator(`.discovery-project-row[href="${href}"]`).count(),
        );
        checks++;
        await page
          .getByRole("tab", {
            name: locale === "en" ? "Hot" : "热门",
            exact: true,
          })
          .click();
        await page.waitForTimeout(200);
        if (width > 700) await page.locator(".header-price button").click();
        else
          await page
            .locator(".market-mobile-sort select")
            .selectOption("price");
        await page.waitForTimeout(200);
        assert.equal(
          await page.locator(".header-price").getAttribute("aria-sort"),
          "descending",
        );
        checks++;
        if (width > 700) await page.locator(".header-price button").click();
        else await page.locator(".market-mobile-sort button").click();
        await page.waitForTimeout(200);
        assert.equal(
          await page.locator(".header-price").getAttribute("aria-sort"),
          "ascending",
        );
        checks++;
        await page
          .locator(".market-local-search input")
          .fill(href.split("/").at(-1));
        await page.waitForTimeout(350);
        assert.equal(await page.locator(".discovery-project-row").count(), 1);
        checks++;
        await page.reload();
        await page.locator(".discovery-project-row").first().waitFor();
        assert.equal(await page.locator('[role="dialog"]').count(), 0);
        checks++;
      }
      await context.close();
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
