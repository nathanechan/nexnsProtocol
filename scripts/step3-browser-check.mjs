import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
fs.mkdirSync("test-results", { recursive: true });
const results = [];
const text = async (p, needle) => {
  await p
    .getByText(needle, { exact: false })
    .filter({ visible: true })
    .first()
    .waitFor();
};
const overflow = async (p, width, label) => {
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    `${width} ${label} overflow`,
  );
  results.push({ width, label });
};
try {
  await page.goto(base + "/create");
  await page.getByRole("button", { name: "下一步" }).click();
  await text(page, "名称必填");
  await page.getByLabel("中文名称", { exact: true }).fill("澄海经济");
  await page.getByLabel("代币符号", { exact: true }).fill("SEA");
  await page
    .getByLabel("中文描述", { exact: true })
    .fill("连接参与者与长期价值的链上项目。");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByLabel("官网", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.waitForURL("**/economy/56/0xe*");
  await text(page, "曲线交易");
  const projectUrl = page.url();
  const contract = projectUrl.split("/").at(-1);
  results.push({ creation: projectUrl });
  await page.getByLabel("支付金额 · USDT", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "买入 SEA", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .locator(".financial-identity")
      .getAttribute("data-contract"),
    contract,
  );
  assert((await page.getByRole("dialog").innerText()).includes("SEA"));
  assert(
    (await page.getByRole("dialog").innerText()).match(/预计获得|实际到账/),
  );
  await page.getByRole("button", { name: "确认交易", exact: true }).click();
  await text(page, "交易成功");
  await page.getByRole("tab", { name: "卖出", exact: true }).click();
  await page.getByLabel("卖出数量 · SEA", { exact: true }).fill("100");
  await page.getByRole("button", { name: "卖出 SEA", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .locator(".financial-identity")
      .getAttribute("data-contract"),
    contract,
  );
  assert((await page.getByRole("dialog").innerText()).includes("SEA"));
  assert(
    (await page.getByRole("dialog").innerText()).match(/预计获得|实际到账/),
  );
  await page.getByRole("button", { name: "确认交易", exact: true }).click();
  await text(page, "交易成功");
  await page.reload();
  await text(page, "曲线交易");
  await page.getByRole("tab", { name: "买入", exact: true }).click();
  const consolePage = await context.newPage();
  await consolePage.goto(base + "/simulation-console");
  await consolePage.getByLabel("选择项目").selectOption("56:" + contract);
  await consolePage
    .getByRole("button", { name: "接近毕业", exact: true })
    .click();
  await text(page, "99,990 USDT");
  await page.getByLabel("支付金额 · USDT", { exact: true }).fill("1000");
  await text(page, "未使用金额");
  await page.getByRole("button", { name: "买入 SEA", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .locator(".financial-identity")
      .getAttribute("data-contract"),
    contract,
  );
  assert((await page.getByRole("dialog").innerText()).includes("SEA"));
  assert(
    (await page.getByRole("dialog").innerText()).match(/预计获得|实际到账/),
  );
  await page.getByRole("button", { name: "确认交易", exact: true }).click();
  await text(page, "曲线已完成，等待迁移");
  assert.equal(page.url(), projectUrl);
  assert.equal(
    await page.getByRole("button", { name: "买入 SEA", exact: true }).count(),
    0,
  );
  await consolePage
    .getByRole("button", { name: "开始迁移", exact: true })
    .click();
  await text(page, "迁移处理中");
  await consolePage
    .getByRole("button", { name: "模拟迁移失败", exact: true })
    .click();
  await text(page, "已返回准备状态");
  await consolePage
    .getByRole("button", { name: "开始迁移", exact: true })
    .click();
  await consolePage
    .getByRole("button", { name: "完成迁移", exact: true })
    .click();
  await page.getByRole("tab", { name: "透明度", exact: true }).click();
  await text(page, "已进入运行阶段");
  assert.equal(page.url(), projectUrl);
  await text(page, "SEA/NEXNS");
  await page.reload();
  await page.getByRole("tab", { name: "透明度", exact: true }).click();
  await text(page, "已进入运行阶段");
  await page.goto(base + "/explore?stage=operating&sort=tvl");
  await page.locator(".market-row").first().waitFor();
  assert((await page.locator(`a[href='/economy/56/${contract}']`).count()) > 0);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "搜索", exact: true })
    .fill(contract);
  await text(page, "合约精准匹配");
  await page.goto(base + "/network");
  await page.locator(".market-row").first().waitFor();
  assert((await page.locator(`a[href='/economy/56/${contract}']`).count()) > 0);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [label, url] of [
      ["create", "/create"],
      ["curve", "/economy/56/0x" + "1".repeat(40)],
      ["operating", projectUrl.replace(base, "")],
      ["network", "/network"],
      ["explore", "/explore?stage=operating&sort=tvl"],
    ]) {
      await page.goto(base + url);
      await page.locator("h1").waitFor();
      if (label === "explore")
        await page.locator(".market-row").first().waitFor();
      if (label === "network")
        await page.locator(".market-row").first().waitFor();
      await overflow(page, width, label);
      await page.screenshot({
        path: `test-results/step3-${width}-${label}.png`,
        fullPage: false,
      });
    }
  }
  const response = await page.goto(base + "/economy/56/0x" + "9".repeat(40));
  assert.equal(response.status(), 404);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/step3-browser.json",
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: true,
      checks: results.length,
      projectUrl,
      errors,
    }),
  );
} finally {
  await browser.close();
}
