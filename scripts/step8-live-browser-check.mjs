import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const checks = [],
  errors = [];
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const base = "http://localhost:3000",
    key = "56:0x" + "4".repeat(40),
    route = "/economy/56/" + key.split(":")[1];
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption(key);
  await page.getByRole("button", { name: "可领取", exact: true }).click();
  await page
    .getByRole("button", { name: "补充模拟项目代币", exact: true })
    .click();
  const snapshot = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("nexus-simulation-v3")),
    );
  const initial = await snapshot(),
    epoch = initial.liveMarket.now;
  await page.clock.install({ time: new Date(epoch + 1000) });
  await page.clock.pauseAt(new Date(epoch + 2000));
  await page.goto(base + "/live?sort=value");
  await page.locator(".market-row").first().waitFor();
  const order = await page
    .locator(".market-row")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("href")));
  const cell = page.locator(`.market-row[href="${route}"]`);
  const before = Number(
    await cell
      .locator(".reference-price [data-value]")
      .getAttribute("data-value"),
  );
  await page.clock.fastForward(8 * 3600000);
  await page.waitForFunction(
    (href) =>
      Number(
        document
          .querySelector(
            `a[href="${href}"].market-row .reference-price [data-value]`,
          )
          ?.getAttribute("data-value"),
      ) > 0,
    route,
  );
  const after = Number(
    await cell
      .locator(".reference-price [data-value]")
      .getAttribute("data-value"),
  );
  assert.notEqual(after, before);
  assert.deepEqual(
    await page
      .locator(".market-row")
      .evaluateAll((rows) => rows.map((r) => r.getAttribute("href"))),
    order,
  );
  checks.push("time-based price motion", "stable selected-sort order");
  const staked = Number(
    await cell
      .locator(".market-staked [data-value]")
      .getAttribute("data-value"),
  );
  const value = Number(
    await cell
      .locator(".market-metric [data-value]")
      .getAttribute("data-value"),
  );
  assert.equal(value, staked * after);
  checks.push("single Value formula in Live row");
  const elapsed = await snapshot();
  assert.deepEqual(elapsed.exactBalances, initial.exactBalances);
  assert.deepEqual(elapsed.operatingBooks, initial.operatingBooks);
  assert(
    elapsed.liveMarket.projects[key].history.length >
      initial.liveMarket.projects[key].history.length,
  );
  checks.push("no entitlement from visual time", "bounded catch-up history");
  await page.goto(base + route);
  await page.locator(".trend-heading [data-value]").waitFor();
  assert.equal(
    Number(
      await page
        .locator(".trend-heading [data-value]")
        .getAttribute("data-value"),
    ),
    staked,
  );
  assert.equal(
    Number(
      await page
        .locator(".terminal-market-strip > div")
        .nth(2)
        .locator("[data-value]")
        .getAttribute("data-value"),
    ),
    value,
  );
  assert.equal(
    Number(
      await page
        .locator(".staking-chart svg[role=img]")
        .getAttribute("data-latest-staked"),
    ),
    staked,
  );
  assert.deepEqual(
    await page.locator(".terminal-market-strip dt").allTextContents(),
    ["价格", "总质押", "质押价值", "流动性", "参与人数"],
  );
  checks.push(
    "terminal/List reconciliation",
    "chart/latest reconciliation",
    "five Chinese metrics",
  );
  await page.getByRole("tab", { name: "活动", exact: true }).click();
  assert((await page.locator(".activity-feed").innerText()).includes("参与"));
  checks.push("anonymous background participation");
  await page.reload();
  await page.waitForFunction(
    (expected) =>
      Number(
        document
          .querySelector(".trend-heading [data-value]")
          ?.getAttribute("data-value"),
      ) === expected,
    staked,
  );
  assert.equal(
    Number(
      await page
        .locator(".terminal-market-strip > div")
        .nth(0)
        .locator("[data-value]")
        .getAttribute("data-value"),
    ),
    after,
  );
  checks.push("price and stake persist on refresh");
  await page.evaluate(() => localStorage.setItem("nexns-locale", "en"));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.deepEqual(
    await page.locator(".terminal-market-strip dt").allTextContents(),
    ["Price", "Staked", "Value", "Liquidity", "Users"],
  );
  checks.push("five English metrics");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ checks: checks.length, passed: checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
