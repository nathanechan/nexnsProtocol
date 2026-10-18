import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v3-site";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [];
const routes = [
  "/portfolio",
  "/create",
  "/studio/NX-0001",
  "/protocol",
  "/nexns",
  "/launch",
  "/live",
  "/economy/56/0x0000000000000000000000000000000000022c23",
  "/economy/56/0x000000000000000000000000000000000003fc24",
];
try {
  for (const locale of ["zh-CN", "en"])
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      await context.addInitScript(
        (l) => localStorage.setItem("nexns-locale", l),
        locale,
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      for (const theme of ["dark", "light"]) {
        for (const route of routes) {
          await page.goto("http://localhost:3000" + route);
          await page.locator("h1").first().waitFor({ state: "attached" });
          if ((await page.locator("html").getAttribute("data-theme")) !== theme)
            await page.locator(".theme-toggle").click();
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            theme,
          );
          checks++;
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            `${locale} ${width} ${theme} ${route}`,
          );
          checks++;
          const surface = page
            .locator(
              ".secondary-page .summary-strip,.secondary-page .card,.secondary-page .compact-results",
            )
            .first();
          if (await surface.count()) {
            assert.equal(
              await surface.evaluate(
                (e) => getComputedStyle(e).backgroundColor,
              ),
              theme === "dark" ? "rgb(16, 18, 23)" : "rgb(255, 255, 255)",
              route,
            );
            checks++;
          }
          const cell = page
            .locator(".secondary-page .compact-results td")
            .first();
          if (await cell.count()) {
            assert.equal(
              await cell.evaluate((e) => getComputedStyle(e).backgroundColor),
              theme === "dark" ? "rgb(16, 18, 23)" : "rgb(255, 255, 255)",
              `${route} table cell`,
            );
            checks++;
          }
          if ([1440, 390].includes(width) && !route.startsWith("/economy"))
            await page.screenshot({
              path: `${out}/${locale}-${width}-${theme}-${route.split("/").at(-1)}.png`,
              fullPage: false,
            });
        }
        await page.reload();
        await page.locator(".theme-toggle").waitFor();
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          theme,
        );
        checks++;
      }
      await page.goto("http://localhost:3000/portfolio");
      await page
        .getByRole("button", {
          name: locale === "en" ? "Search" : "搜索",
          exact: true,
        })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page
          .getByRole("dialog")
          .evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(255, 255, 255)",
      );
      checks++;
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      checks++;
      await page.locator(".theme-toggle").click();
      await page
        .getByRole("button", {
          name: locale === "en" ? "Wallet" : "钱包",
          exact: true,
        })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page
          .getByRole("dialog")
          .evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(16, 18, 23)",
      );
      checks++;
      await page.keyboard.press("Escape");
      await context.close();
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
