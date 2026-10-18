import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
fs.mkdirSync("test-results/details-polish", { recursive: true });
try {
  for (const locale of ["zh-CN", "en"])
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(
        (l) => localStorage.setItem("nexns-locale", l),
        locale,
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        "http://localhost:3000/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
      );
      await page.locator(".terminal-actions input").first().waitFor();
      assert.equal(await page.locator(".terminal-navigation").count(), 0);
      checks++;
      for (const theme of ["light", "dark"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.locator(".theme-toggle").click();
        for (const tab of await page
          .locator(".terminal-details>.product-tabs>.product-tablist>button")
          .all()) {
          await tab.click();
          await page
            .locator(".terminal-detail-content")
            .scrollIntoViewIfNeeded();
          const parent = await page.locator(".terminal-details").boundingBox();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          checks++;
          for (const card of await page
            .locator(
              ".terminal-detail-content .card:not(.metric),.terminal-detail-content .terminal-history",
            )
            .all()) {
            const r = await card.boundingBox();
            if (!r || r.height === 0) continue;
            assert(
              r.x >= parent.x - 1 &&
                r.x + r.width <= parent.x + parent.width + 1,
              `${locale} ${width} ${await tab.innerText()} card`,
            );
            checks++;
            assert(
              parseFloat(
                await card.evaluate((e) => getComputedStyle(e).paddingLeft),
              ) >= 16,
              `${locale} ${width} ${await tab.innerText()} padding ${await card.getAttribute("class")}`,
            );
            checks++;
          }
          const name = await tab.getAttribute("id");
          if ([1440, 390].includes(width))
            await page.screenshot({
              path: `test-results/details-polish/${locale}-${width}-${theme}-${name?.replace(/[^a-zA-Z0-9-]/g, "")}.png`,
            });
        }
      }
      await page.goto(
        "http://localhost:3000/economy/56/0x0000000000000000000000000000000000022c23",
      );
      await page.locator(".terminal-actions input").first().waitFor();
      assert.equal(await page.locator(".terminal-navigation > a").count(), 0);
      checks++;
      await context.close();
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
