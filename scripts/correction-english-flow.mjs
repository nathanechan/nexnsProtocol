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
  await page.locator(".language-switch").selectOption("en");
  await page.getByRole("button", { name: "Next" }).click();
  await text(page, "Name is required");
  await page.getByLabel("Project Name", { exact: true }).fill("澄海经济");
  await page.getByLabel("Token Symbol", { exact: true }).fill("SEA");
  await page
    .getByLabel("Description", { exact: true })
    .fill("连接参与者与长期价值的链上项目。");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "Next" }).click();
  await page
    .getByRole("button", { name: "Create Project", exact: true })
    .click();
  await page.waitForURL("**/economy/56/0xe*");
  await text(page, "Curve trade");
  const projectUrl = page.url();
  const contract = projectUrl.split("/").at(-1);
  results.push({ creation: projectUrl });
  await page.getByLabel("Pay amount · USDT", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Confirm buy", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm trade", exact: true })
    .click();
  await text(page, "Trade completed");
  await page.getByRole("tab", { name: "Sell", exact: true }).click();
  await page.getByLabel("Sell amount · SEA", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Confirm sell", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm trade", exact: true })
    .click();
  await text(page, "Trade completed");
  await page.reload();
  await text(page, "Curve trade");
  await page.getByRole("tab", { name: "Buy", exact: true }).click();
  const consolePage = await context.newPage();
  await consolePage.goto(base + "/simulation-console");
  await consolePage
    .locator("main select")
    .first()
    .selectOption("56:" + contract);
  await consolePage
    .getByRole("button", { name: "接近毕业", exact: true })
    .click();
  await text(page, "99,990 USDT");
  await page.getByLabel("Pay amount · USDT", { exact: true }).fill("1000");
  await text(page, "Unused amount");
  await page.getByRole("button", { name: "Confirm buy", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm trade", exact: true })
    .click();
  await text(page, "Curve completed. Awaiting migration.");
  assert.equal(page.url(), projectUrl);
  assert.equal(
    await page
      .getByRole("button", { name: "Confirm buy", exact: true })
      .count(),
    0,
  );
  await consolePage
    .getByRole("button", { name: "开始迁移", exact: true })
    .click();
  await text(page, "Migration in progress");
  await consolePage
    .getByRole("button", { name: "模拟迁移失败", exact: true })
    .click();
  await text(page, "Returned to ready state");
  await consolePage
    .getByRole("button", { name: "开始迁移", exact: true })
    .click();
  await consolePage
    .getByRole("button", { name: "完成迁移", exact: true })
    .click();
  await page.getByRole("tab", { name: "Transparency", exact: true }).click();
  await text(page, "Operating · Migration completed");
  assert.equal(page.url(), projectUrl);
  await text(page, "SEA/NEXNS");
  await page.reload();
  await page.getByRole("tab", { name: "Transparency", exact: true }).click();
  await text(page, "Operating · Migration completed");
  await page.goto(base + "/explore?stage=operating&sort=tvl");
  await page.locator(".market-row").first().waitFor();
  assert((await page.locator(`a[href='/economy/56/${contract}']`).count()) > 0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill(contract);
  await text(page, "Exact contract match");
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
  await page.goto(projectUrl);
  await consolePage
    .getByRole("button", { name: "补充模拟 USDT", exact: true })
    .click();
  await consolePage
    .getByRole("button", { name: "补充模拟项目代币", exact: true })
    .click();
  const act = async (trigger) => {
    await page.getByRole("button", { name: trigger, exact: true }).click();
    const dialog = page.getByRole("dialog");
    assert.equal(
      await dialog.locator(".financial-identity").getAttribute("data-contract"),
      contract,
    );
    await page
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await page.locator(".operation-success").waitFor();
  };
  await page.getByRole("tab", { name: "Participate", exact: true }).click();
  await page
    .getByLabel("Participation amount · USDT", { exact: true })
    .fill("1000");
  await act("Confirm participation");
  await page.getByRole("tab", { name: "Stake", exact: true }).first().click();
  await page.getByLabel("Stake amount · SEA", { exact: true }).fill("1000");
  await act("Confirm stake");
  await consolePage
    .getByRole("button", { name: "建立推荐树", exact: true })
    .click();
  await page.getByRole("tab", { name: "Contribution", exact: true }).click();
  await text(page, "Contribution value");
  await consolePage
    .getByRole("button", { name: "结算当日", exact: true })
    .click();
  await page.getByRole("tab", { name: "Rewards", exact: true }).click();
  await page.getByRole("tab", { name: "Claim", exact: true }).click();
  await page.getByLabel("Claim amount · SEA", { exact: true }).fill("1");
  await text(page, "You receive");
  await act("Confirm claim");
  for (const route of [
    "/my-nexus",
    "/studio/" +
      JSON.parse(
        await page.evaluate(() => localStorage.getItem("nexus-simulation-v3")),
      ).projects["56:" + contract].projectId,
    "/protocol",
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.doesNotMatch(
      await page.locator("main [role=tablist]").innerText(),
      /[\u4e00-\u9fff]/,
    );
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/correction-english-flow.json",
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
