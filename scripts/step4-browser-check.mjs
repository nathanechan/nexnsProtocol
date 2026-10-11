import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors = [];
const capture = (p) => p.on("pageerror", (e) => errors.push(e.message));
capture(page);
context.on("page", capture);
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const contract = "0x" + "1".repeat(40),
  key = "56:" + contract,
  url = base + "/economy/56/" + contract;
const results = [];
fs.mkdirSync("test-results", { recursive: true });
const text = async (p, value) =>
  p
    .getByText(value, { exact: false })
    .filter({ visible: true })
    .first()
    .waitFor();
const operate = async (p, button) => {
  await p.getByRole("button", { name: button, exact: true }).click();
  await p.getByRole("button", { name: "确认操作", exact: true }).click();
  await text(p, "成功，资产与权益已更新");
};
const overflow = async (p, width, label) => {
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    `${width} ${label}`,
  );
  results.push({ width, label });
};
try {
  const consolePage = await context.newPage();
  await consolePage.goto(base + "/simulation-console");
  await consolePage.getByLabel("选择项目").selectOption(key);
  await consolePage
    .getByRole("button", { name: "运行阶段", exact: true })
    .click();
  await text(consolePage, "模拟日结");
  await consolePage
    .getByRole("button", { name: "补充模拟 USDT", exact: true })
    .click();
  await consolePage
    .getByRole("button", { name: "补充模拟项目代币", exact: true })
    .click();
  await page.goto(url);
  await page.getByRole("tab", { name: "参与", exact: true }).click();
  await page.getByLabel("参与金额 · USDT", { exact: true }).fill("2400");
  await text(page, "不作为可赎回本金");
  await operate(page, "确认参与");
  await text(page, "独立头寸");
  const personal = await context.newPage();
  await personal.goto(base + "/my-nexus");
  await text(personal, "2,400 USDT");
  await page.getByRole("tab", { name: "质押", exact: true }).first().click();
  await page.getByLabel("质押数量 · SEA", { exact: true }).fill("2400");
  await operate(page, "确认质押");
  await text(page, "50%");
  await page.getByRole("tab", { name: "解除质押", exact: true }).click();
  await page.getByLabel("解除质押数量 · SEA", { exact: true }).fill("100");
  await operate(page, "确认解除质押");
  await page.getByRole("tab", { name: "质押", exact: true }).last().click();
  await page.getByLabel("质押数量 · SEA", { exact: true }).fill("100");
  await operate(page, "确认质押");
  await consolePage
    .getByRole("button", { name: "建立推荐树", exact: true })
    .click();
  await page.getByRole("tab", { name: "贡献", exact: true }).click();
  await text(page, "1,000");
  await page.getByRole("button", { name: "复制推荐链接", exact: true }).click();
  await text(page, "推荐链接已复制");
  await consolePage
    .getByRole("button", { name: "结算当日", exact: true })
    .click();
  await page.getByRole("tab", { name: "奖励", exact: true }).click();
  await text(page, "可领取");
  await page.getByLabel("领取数量 · SEA", { exact: true }).fill("10");
  await text(page, "8.5 SEA");
  await consolePage
    .getByRole("button", { name: "下一次协议操作失败", exact: true })
    .click();
  await page.getByRole("button", { name: "确认领取", exact: true }).click();
  await page.getByRole("button", { name: "确认操作", exact: true }).click();
  await text(page, "处理失败");
  await operate(page, "确认领取");
  await text(page, "本次领取 10 SEA");
  await personal.getByRole("tab", { name: "奖励", exact: true }).click();
  await text(personal, "累计毛领取");
  assert((await personal.locator("main").innerText()).includes("10 SEA"));
  await page.reload();
  await page.getByRole("tab", { name: "奖励", exact: true }).click();
  await text(page, "本次领取 10 SEA");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const label of [
      "参与",
      "质押",
      "贡献",
      "奖励",
      "资产",
      "活动",
      "透明度",
      "总览",
    ]) {
      await page.getByRole("tab", { name: label, exact: true }).first().click();
      await overflow(page, width, label);
      if (["参与", "质押", "奖励", "总览"].includes(label))
        await page.screenshot({
          path: `test-results/step4-${width}-${label}.png`,
          fullPage: true,
        });
    }
    await personal.setViewportSize({ width, height: 1000 });
    await overflow(personal, width, "MyNEXUS");
  }
  // All four critical mobile controls remain actionable, including keyboard-safe confirmation.
  await page.getByRole("tab", { name: "参与", exact: true }).click();
  await page.getByLabel("参与金额 · USDT", { exact: true }).fill("100");
  await page.getByRole("button", { name: "确认参与", exact: true }).click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await operate(page, "确认参与");
  await page.getByRole("tab", { name: "质押", exact: true }).first().click();
  await page.getByLabel("质押数量 · SEA", { exact: true }).fill("100");
  await operate(page, "确认质押");
  await page.getByRole("tab", { name: "解除质押", exact: true }).click();
  await page.getByLabel("解除质押数量 · SEA", { exact: true }).fill("100");
  await operate(page, "确认解除质押");
  await page.getByRole("tab", { name: "奖励", exact: true }).click();
  await page.getByLabel("领取数量 · SEA", { exact: true }).fill("1");
  await operate(page, "确认领取");
  assert.equal(
    await page
      .getByRole("button", { name: /结算当日|开始迁移|回购|添加 LP/ })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/step4-browser.json",
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ passed: true, responsiveChecks: results.length, errors }),
  );
} finally {
  await browser.close();
}
