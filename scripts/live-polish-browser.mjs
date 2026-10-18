import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
let checks = 0;
fs.mkdirSync("test-results/live-polish", { recursive: true });
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date() });
    await page.goto("http://localhost:3000/launch");
    await page.locator(".reference-price [data-value]").first().waitFor();
    assert.equal(await page.locator("main .market-stage-switch").count(), 0);
    checks++;
    const snapshot = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("nexus-simulation-v3")),
      );
    const before = await snapshot();
    const price = await page
      .locator(".reference-price [data-value]")
      .first()
      .getAttribute("data-value");
    await page.clock.fastForward(12000);
    await page.waitForTimeout(100);
    assert.notEqual(
      await page
        .locator(".reference-price [data-value]")
        .first()
        .getAttribute("data-value"),
      price,
    );
    checks++;
    const after = await snapshot();
    assert.deepEqual(after.exactBalances, before.exactBalances);
    assert.deepEqual(after.operatingBooks, before.operatingBooks);
    checks += 2;
    assert(
      after.activities.filter((a) => a.id.startsWith("FLOW-")).length >
        before.activities.filter((a) => a.id.startsWith("FLOW-")).length,
    );
    checks++;
    await page.goto("http://localhost:3000/live");
    await page.locator(".reference-price [data-value]").first().waitFor();
    const op = await page
      .locator(".reference-price [data-value]")
      .first()
      .getAttribute("data-value");
    await page.clock.fastForward(12000);
    assert.notEqual(
      await page
        .locator(".reference-price [data-value]")
        .first()
        .getAttribute("data-value"),
      op,
    );
    checks++;
    assert.equal(
      await page
        .locator(".global-search-trigger")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    checks++;
    await page.goto(
      "http://localhost:3000/economy/56/0x000000000000000000000000000000000003fc24",
    );
    await page.locator(".terminal-actions input").first().waitFor();
    assert.equal(await page.locator(".terminal-action-jump").count(), 0);
    checks++;
    await page
      .locator(".app-header")
      .getByRole("button", {
        name: locale === "en" ? "Search" : "搜索",
        exact: true,
      })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    checks++;
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page
        .locator(".terminal-details .product-tablist")
        .scrollIntoViewIfNeeded();
      const parent = await page.locator(".terminal-details").boundingBox();
      for (const b of await page
        .locator(".terminal-details .product-tablist > button")
        .all()) {
        const r = await b.boundingBox();
        assert(
          r.x >= parent.x - 1 && r.x + r.width <= parent.x + parent.width + 1,
        );
        checks++;
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      checks++;
      await page.screenshot({
        path: `test-results/live-polish/${locale}-${width}-tabs.png`,
      });
    }
    await page.goto("http://localhost:3000/nexns");
    assert.equal(
      await page
        .getByRole("link", { name: /进入 NEXNS 终端|Open NEXNS terminal/ })
        .count(),
      0,
    );
    checks++;
    assert(
      !(await page.locator("main").innerText()).includes("遵循与普通项目相同"),
    );
    checks++;
    await page.reload();
    await page.locator("h1").waitFor();
    const restored = await snapshot();
    assert(Object.values(restored.curves).some((l) => l.marketActor));
    checks++;
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
