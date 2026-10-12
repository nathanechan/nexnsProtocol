import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors = [],
  consoleErrors = [],
  checks = [];
context.on("page", (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const key = "56:0x" + "1".repeat(40);
const text = async (value) =>
  page.getByText(value, { exact: false }).first().waitFor();
const check = async (label) => {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    label + " overflow",
  );
  assert.equal(await page.locator("h1").count(), 1, label + " heading");
  assert.equal(await page.getByRole("main").count(), 1, label + " landmark");
  assert.equal(
    await page
      .getByRole("button", {
        name: /^回购$|^Buyback$|^添加 LP$|^Add LP$|^Mint$|^铸造$|^强制迁移$/,
      })
      .count(),
    0,
    label + " backend button",
  );
  checks.push(label);
};
fs.mkdirSync("test-results", { recursive: true });
try {
  await page.goto(base + "/simulation-console");
  await page
    .getByRole("button", { name: "01 · 全新发行", exact: true })
    .click();
  const selection = await page.getByLabel("选择项目").inputValue();
  const project = JSON.parse(
    await page.evaluate(() => localStorage.getItem("nexus-simulation-v3")),
  ).projects[selection];
  await page.goto(base + "/studio/" + project.projectId);
  await page.getByLabel("文字标识", { exact: true }).fill("新");
  await page
    .getByLabel("官网链接", { exact: true })
    .fill("https://example.com/nexus");
  await page.getByRole("button", { name: "保存资料", exact: true }).click();
  await text("资料已更新");
  const saved = JSON.parse(
    await page.evaluate(() => localStorage.getItem("nexus-simulation-v3")),
  );
  assert.equal(saved.projects[selection].logo, "新");
  assert.equal(saved.projects[selection].name, project.name);
  await page.reload();
  await page.getByLabel("官网链接", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("官网链接", { exact: true }).inputValue(),
    "https://example.com/nexus",
  );
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption(key);
  await page
    .getByRole("button", { name: "06 · 运行活跃用户", exact: true })
    .click();
  const second = await context.newPage();
  await second.goto(base + "/my-nexus");
  await second.getByText("1,000 USDT", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "结算当日", exact: true }).click();
  await second.getByRole("tab", { name: "奖励", exact: true }).click();
  await second.getByText("80 SEA", { exact: true }).first().waitFor();
  await page
    .getByRole("button", { name: "08 · 已完成仓位", exact: true })
    .click();
  await second.getByRole("tab", { name: "仓位", exact: true }).click();
  await second.getByLabel("仓位状态筛选").selectOption("COMPLETED");
  await second
    .getByRole("row")
    .filter({ hasText: /仓位.*已完成/ })
    .first()
    .waitFor();
  await page
    .getByRole("button", { name: "07 · 奖励就绪", exact: true })
    .click();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/network",
      "/explore",
      "/explore?stage=operating&sort=tvl",
      "/create",
      "/p-ecosystem",
      "/economy/56/" + "0x" + "2".repeat(40),
      "/economy/56/" + "0x" + "3".repeat(40),
    ]) {
      await page.goto(base + route);
      await page.locator("h1").waitFor();
      await page.waitForTimeout(250);
      await check(`${width} ${route}`);
    }
    await page.goto(base + "/my-nexus");
    for (const label of [
      "总览",
      "项目",
      "仓位",
      "质押",
      "奖励",
      "网络",
      "活动",
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await check(`${width} personal ${label}`);
      if (label === "总览")
        await page.screenshot({
          path: `test-results/final-${width}-personal.png`,
          fullPage: true,
        });
    }
    await page.goto(base + "/studio/NX-0001");
    for (const label of [
      "总览",
      "参与者",
      "增长",
      "网络",
      "流动性",
      "财库",
      "代币",
      "收入",
      "分析",
      "生命周期",
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await check(`${width} studio ${label}`);
      if (["总览", "分析"].includes(label))
        await page.screenshot({
          path: `test-results/final-${width}-studio-${label}.png`,
          fullPage: true,
        });
      if (label === "分析")
        assert((await page.getByText(/查看图表数据/).count()) > 0);
    }
    await page.goto(base + "/protocol");
    for (const label of [
      "总览",
      "供应",
      "合约",
      "结算",
      "价格状态",
      "公开事件",
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await check(`${width} protocol ${label}`);
      if (label === "总览")
        await page.screenshot({
          path: `test-results/final-${width}-protocol.png`,
          fullPage: true,
        });
    }
  }
  // Keyboard tabs, focus indication, labels, modal Escape and reduced motion.
  await page.goto(base + "/protocol");
  const first = page.getByRole("tab", { name: "总览", exact: true });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "合约", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert(
    await page.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle !== "none",
    ),
  );
  await page.getByRole("button", { name: "钱包", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert(await page.getByRole("dialog").getAttribute("aria-labelledby"));
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".button")).transitionDuration,
    ),
    "0s",
  );
  await page.goto(base + "/economy/56/" + "0x" + "1".repeat(40) + "?tab=stake");
  await page.getByLabel("质押数量 · SEA", { exact: true }).waitFor();
  const unnamed = await page.evaluate(
    () =>
      [...document.querySelectorAll("button")].filter(
        (e) =>
          !e.textContent.trim() &&
          !e.getAttribute("aria-label") &&
          !e.getAttribute("aria-labelledby"),
      ).length,
  );
  assert.equal(unnamed, 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  const result = {
    passed: true,
    responsiveChecks: checks.length,
    accessibility: [
      "landmarks/headings",
      "named buttons",
      "labelled forms",
      "keyboard tabs",
      "visible focus",
      "dialog name/Escape",
      "reduced motion",
      "chart data alternatives",
    ],
    errors,
    consoleErrors,
  };
  fs.writeFileSync(
    "test-results/step5-browser.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
