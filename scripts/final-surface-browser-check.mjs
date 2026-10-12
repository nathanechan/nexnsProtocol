import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption("56:0x" + "1".repeat(40));
  await page.getByRole("button", { name: "运行阶段", exact: true }).click();
  await page.goto(base + "/portfolio");
  await page.locator(".summary-strip").waitFor();
  const snapshot = JSON.parse(
    await page.evaluate(() => localStorage.getItem("nexus-simulation-v3")),
  );
  const projects = Object.values(snapshot.projects);
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate((l) => localStorage.setItem("nexns-locale", l), locale);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/portfolio");
      await page.waitForFunction(
        (l) => document.documentElement.lang === l,
        locale,
      );
      await page.locator(".summary-strip dt").first().waitFor();
      const summary = page.locator(".summary-strip");
      assert.equal(
        await summary.locator("div").first().getAttribute("class"),
        "summary-claimable",
      );
      assert(
        (await summary
          .locator(".summary-claimable dd")
          .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >
          (await summary
            .locator(".summary-projects dd")
            .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))),
      );
      assert.equal(
        await page
          .locator(".app-header")
          .getByRole("button", {
            name: locale === "en" ? "Search" : "搜索",
            exact: true,
          })
          .count(),
        1,
      );
      await page.keyboard.press("Control+k");
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.equal(await dialog.getAttribute("aria-modal"), "true");
      await dialog.getByRole("searchbox").focus();
      await page.keyboard.press("Shift+Tab");
      assert(await dialog.evaluate((e) => e.contains(document.activeElement)));
      await page.keyboard.press("Tab");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.waitForFunction(
        () => document.querySelector(":focus-visible"),
        { timeout: 3000 },
      );
      assert((await page.locator(":focus-visible").count()) > 0);
      checks.push(
        `${locale} ${width} summary hierarchy/search/focus trap/Escape`,
      );
      for (const status of ["VALID", "PROTECTED", "PRICE_INVALID"]) {
        const p = projects.find(
          (p) => p.lifecycle === "OPERATING" && p.priceStatus === status,
        );
        assert(p);
        await page.goto(`${base}/economy/${p.chainId}/${p.tokenContract}`);
        await page.locator(".terminal-actions").waitFor();
        const header = page.locator(".terminal-header");
        assert.equal(
          await header.locator(".badge").count(),
          status === "VALID" ? 0 : 1,
        );
        assert.equal(await page.locator(".terminal-history").count(), 0);
        const dex = page.getByRole("button", {
          name: locale === "en" ? "Trade on DEX ↗" : "去交易 ↗",
          exact: true,
        });
        assert(await dex.isDisabled());
        assert.equal(await dex.getAttribute("href"), null);
        const tabs = page.getByRole("tablist", {
          name: locale === "en" ? "Terminal actions" : "终端操作",
        });
        assert.deepEqual(
          await tabs.getByRole("tab").allTextContents(),
          locale === "en"
            ? ["Participate", "Stake", "Claim"]
            : ["参与", "质押", "领取"],
        );
        assert.equal(
          await page.locator(".terminal-actions .action-rules[open]").count(),
          0,
        );
        assert.equal(
          await page.locator(".terminal-actions .financial-identity").count(),
          0,
        );
        if (width <= 768) {
          assert((await tabs.boundingBox()).y < 450);
          assert(
            (await page.locator(".terminal-actions").boundingBox()).y <
              (await page.locator(".terminal-market-strip").boundingBox()).y,
          );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.doesNotMatch(
          await page.locator("main").innerText(),
          /\bDemo\b|Mock|Simulation|Placeholder|Future integration/,
        );
        checks.push(
          `${locale} ${width} ${status} status/DEX/actions/disclosure`,
        );
        if (status === "VALID")
          await page.screenshot({
            path: `test-results/final-operating-${locale}-${width}.png`,
          });
      }
    }
  }
  assert.deepEqual(errors, []);
  const result = { passed: true, checks: checks.length, errors };
  fs.writeFileSync(
    "test-results/final-surface-browser.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
