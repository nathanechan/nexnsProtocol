import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v3-preview";
fs.mkdirSync(out, { recursive: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3003");
    for (const theme of ["dark", "light"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.locator("#theme").click();
      for (const view of ["market", "terminal"]) {
        await page.locator(`.nav [data-page="${view}"]`).click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        checks++;
        const visibleText = await page.locator("body").innerText();
        assert(
          ![
            "演示项目",
            "阶段榜单",
            "Top 100",
            "DESIGN REVIEW",
            "预览买入",
            "非实时市场",
            "估算排版",
          ].some((text) => visibleText.includes(text)),
        );
        checks++;
        const selectedControl =
          view === "market" ? ".filters .active" : ".trade-tabs .active";
        assert.equal(
          await page
            .locator(selectedControl)
            .evaluate((e) => getComputedStyle(e).backgroundColor),
          await page
            .locator(".wallet")
            .evaluate((e) => getComputedStyle(e).backgroundColor),
        );
        checks++;
        assert(
          ![
            "Mireva",
            "Teryn",
            "Avenor",
            "Sylune",
            "Kovra",
            "Evrin",
            "Lumaris",
            "Rovelle",
          ].some((name) => visibleText.includes(name)),
        );
        checks++;
        if (view === "terminal") {
          const submit = await page.locator("#submit").boundingBox();
          if (width <= 760) {
            assert(submit.y + submit.height < 844);
            checks++;
          }
          await page.locator("#amount").fill("100");
          assert.equal(await page.locator("#submit").isEnabled(), true);
          checks++;
          await page.locator("#submit").click();
          assert.equal(await page.locator("dialog").isVisible(), true);
          checks++;
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("dialog").isVisible(), false);
          checks++;
          await page.locator("#amount").fill("999999999999999999999");
          assert.equal(await page.locator("#submit").isDisabled(), true);
          checks++;
          await page.locator('[data-action="sell"]').click();
          assert.equal(await page.locator("#amount-unit").innerText(), "FIELD");
          checks++;
          await page.locator("#max").click();
          assert.equal(await page.locator("#amount").inputValue(), "1280");
          checks++;
          await page.locator('[data-action="buy"]').click();
          await page.locator('[data-chart="curve"]').click();
          assert(
            (await page.locator("#chart").getAttribute("aria-label")).includes(
              "储备",
            ),
          );
          checks++;
          await page.locator('[data-chart="price"]').click();
        }
        if ([1440, 390].includes(width))
          await page.screenshot({
            path: `${out}/${theme}-${width}-${view}.png`,
            fullPage: true,
          });
      }
    }
    await page.locator('.nav [data-page="market"]').click();
    await page.locator("#search").fill("FIELD");
    assert.equal(await page.locator(".market-row").count(), 1);
    checks++;
    await page.locator(".favorite").click();
    await page.locator("#search").fill("");
    await page.locator('[data-sort="favorite"]').click();
    assert.equal(await page.locator(".market-row").count(), 1);
    checks++;
    await page.locator('[data-sort="hot"]').click();
    await page.locator('[data-stage="operating"]').click();
    assert.equal(await page.locator("#stage-column").innerText(), "质押价值");
    checks++;
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
