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
try {
  const name = "  Atlas 澄海  ",
    description = "Original 项目简介\nSecond line.";
  await page.goto(base + "/create");
  assert.equal(
    await page.locator(".identity-fields input:not([type=file])").count(),
    2,
  );
  assert.equal(await page.locator(".identity-fields textarea").count(), 1);
  assert.equal(await page.getByLabel("中文名称", { exact: true }).count(), 0);
  await page.getByLabel("项目名称", { exact: true }).fill(name);
  await page.getByLabel("代币符号", { exact: true }).fill("ATLS");
  await page.getByLabel("简介", { exact: true }).fill(description);
  await page.locator(".language-switch").selectOption("en");
  assert.equal(
    await page.getByLabel("Project Name", { exact: true }).inputValue(),
    name,
  );
  assert.equal(
    await page.getByLabel("Description", { exact: true }).inputValue(),
    description,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(await page.locator(".wizard-fields input").count(), 5);
  assert.equal(await page.getByLabel("X", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(await page.locator(".wizard-review h3").textContent(), name);
  assert.equal(
    await page.locator(".wizard-review > p").textContent(),
    description,
  );
  await page
    .getByRole("button", { name: "Create Project", exact: true })
    .click();
  await page.waitForURL("**/economy/56/0xe*");
  const route = page.url();
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  assert.equal(
    await page.locator(".project-description").textContent(),
    description,
  );
  await page.locator(".language-switch").selectOption("zh-CN");
  assert.equal(await page.locator("h1 [data-token-name]").textContent(), name);
  assert.equal(
    await page.locator(".project-description").textContent(),
    description,
  );
  await page.reload();
  await page.locator("h1 [data-token-name]").waitFor();
  assert.equal(await page.locator("h1 [data-token-name]").textContent(), name);
  checks.push(
    "single metadata fields, raw creation/review/language/reload preservation",
  );
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption("56:0x" + "1".repeat(40));
  await page
    .getByRole("button", { name: "07 · 奖励就绪", exact: true })
    .click();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/economy/56/0x" + "1".repeat(40));
    const actionTabs = page.getByRole("tablist", { name: "终端操作" });
    await actionTabs.waitFor();
    const points = [];
    for (const action of ["参与", "质押", "领取"]) {
      await actionTabs.getByRole("tab", { name: action, exact: true }).click();
      await page.waitForTimeout(50);
      const panel = page.locator(
        ".terminal-actions > .product-tabs > [role=tabpanel]",
      );
      const button = panel.locator(".operation-confirm");
      points.push({
        y: (await button.boundingBox()).y,
        height: (await panel.boundingBox()).height,
        scroll: await page.evaluate(() => scrollY),
      });
      if (width === 390)
        assert.equal(
          await actionTabs.evaluate((e) => getComputedStyle(e).position),
          "sticky",
        );
      assert.equal(
        await page
          .locator(".terminal-actions")
          .evaluate((e) => getComputedStyle(e).borderLeftWidth),
        "1px",
      );
      assert.equal(
        await panel.evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `test-results/detail-${width}-${action}.png`,
      });
      checks.push(
        `${width} ${action} continuous surface/reduced motion/overflow`,
      );
    }
    assert(
      Math.max(...points.map((p) => p.y)) -
        Math.min(...points.map((p) => p.y)) <=
        32,
      JSON.stringify(points),
    );
    assert(
      Math.max(...points.map((p) => p.height)) -
        Math.min(...points.map((p) => p.height)) <=
        32,
      JSON.stringify(points),
    );
    assert(
      Math.max(...points.map((p) => p.scroll)) -
        Math.min(...points.map((p) => p.scroll)) <=
        8,
      JSON.stringify(points),
    );
    if (width <= 768) {
      assert.deepEqual(
        await page.locator(".mobile-primary a").allTextContents(),
        ["发行", "运行", "资产"],
      );
      assert.equal(
        await page.locator(".mobile-primary a[href='/create']").count(),
        0,
      );
    }
    checks.push(
      `${width} stable action height/CTA/scroll and three mobile destinations`,
    );
  }
  assert.deepEqual(errors, []);
  const result = { passed: true, checks: checks.length, route, errors };
  fs.writeFileSync(
    "test-results/detail-correction-browser.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
