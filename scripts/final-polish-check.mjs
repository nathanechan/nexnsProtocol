import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const checked = [];
try {
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption("56:0x" + "1".repeat(40));
  await page
    .getByRole("button", { name: "07 · 奖励就绪", exact: true })
    .click();
  await page.goto(base + "/economy/56/0x" + "1".repeat(40) + "?tab=rewards");
  await page.getByRole("tab", { name: "领取", exact: true }).click();
  await page.getByLabel("领取数量 · SEA", { exact: true }).fill("10");
  await page.getByRole("button", { name: "确认领取", exact: true }).click();
  await page.getByRole("button", { name: "确认操作", exact: true }).click();
  await page.getByText("成功，资产与权益已更新", { exact: false }).waitFor();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, tab] of [
      ["/my-nexus", null],
      ["/studio/NX-0001", "财库"],
      ["/protocol", null],
      ["/simulation-console", null],
    ]) {
      await page.goto(base + route);
      await page.locator("h1").waitFor();
      if (tab) await page.getByRole("tab", { name: tab, exact: true }).click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.equal(
        (await page.locator("main").innerText()).includes("USDT USDT"),
        false,
      );
      await page.screenshot({
        path: `test-results/polish-${width}-${route.split("/")[1]}.png`,
        fullPage: true,
      });
      if (width === 390 && tab === "财库") {
        const table = page.getByRole("table", {
          name: "财库结果历史",
          exact: true,
        });
        assert.equal(await table.count(), 1);
        assert(
          await table.evaluate(
            (e) => e.parentElement.scrollWidth <= e.parentElement.clientWidth,
          ),
        );
        await page.getByRole("tab", { name: "财库", exact: true }).focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(
          await page
            .getByRole("tab", { name: "代币", exact: true })
            .getAttribute("aria-selected"),
          "true",
        );
      }
      checked.push(`${width} ${route}`);
    }
  }
  await page.goto(base + "/my-nexus");
  await page.locator(".summary-strip dt").first().waitFor();
  const contrast = await page.evaluate(() => {
    const rgb = (t) =>
      t
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
    const lum = (c) =>
      c
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const foreground = lum(
      rgb(getComputedStyle(document.querySelector(".summary-strip dt")).color),
    );
    const background = lum(
      rgb(
        getComputedStyle(document.querySelector(".summary-strip"))
          .backgroundColor,
      ),
    );
    return (background + 0.05) / (foreground + 0.05);
  });
  assert(contrast >= 4.5);
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    checks: checked.length,
    secondaryTextContrast: contrast,
    errors,
  };
  fs.writeFileSync(
    "test-results/final-polish.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
