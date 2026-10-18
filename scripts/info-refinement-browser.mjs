import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
fs.mkdirSync("test-results/info-refinement", { recursive: true });
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
      await page
        .locator(".terminal-details")
        .getByRole("tab", {
          name: locale === "en" ? "Details" : "资料",
          exact: true,
        })
        .click();
      for (const theme of ["light", "dark"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.locator(".theme-toggle").click();
        const info = page.locator(".project-public-info");
        await info.scrollIntoViewIfNeeded();
        const r = await info.boundingBox();
        assert(r.x >= 0 && r.x + r.width <= width);
        checks++;
        for (const el of await info.locator(".key-values > div").all()) {
          const b = await el.boundingBox();
          assert(b.x >= r.x && b.x + b.width <= r.x + r.width + 1);
          checks++;
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        checks++;
        assert.equal(
          await page
            .locator(".terminal-actions input")
            .first()
            .evaluate((e) => getComputedStyle(e).fontFamily),
          await info
            .locator(".key-values dd")
            .first()
            .evaluate((e) => getComputedStyle(e).fontFamily),
        );
        checks++;
        assert(
          !(await page.locator("body").innerText()).match(
            /模拟环境|Simulation environment|项目链接：N\/A/,
          ),
        );
        checks++;
        await page.screenshot({
          path: `test-results/info-refinement/${locale}-${width}-${theme}.png`,
        });
      }
      await context.close();
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
