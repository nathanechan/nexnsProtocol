import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const checks = [],
  errors = [];
try {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const op = "0x" + "4".repeat(40),
    curve = "0x" + "1".repeat(40);
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption("56:" + op);
  await page.getByRole("button", { name: "可领取", exact: true }).click();
  await page
    .getByRole("button", { name: "补充模拟项目代币", exact: true })
    .click();
  const routes = [
    ["launch", "/launch"],
    ["live", "/live"],
    ["curve", "/economy/56/" + curve],
    ["operating", "/economy/56/" + op],
    ["portfolio", "/portfolio"],
    ["create", "/create"],
  ];
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate((l) => localStorage.setItem("nexns-locale", l), locale);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, route] of routes) {
        await page.goto(base + route);
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        await page.locator("main h1").waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${name} ${locale} ${width} overflow`,
        );
        if (["launch", "live"].includes(name)) {
          await page.locator(".market-row").first().waitFor();
          assert.equal(
            await page.locator(".market-row").count(),
            await page.locator(".market-row .token-mark").count(),
          );
          assert.doesNotMatch(
            await page.locator("main").innerText(),
            /平台币|Platform Token/,
          );
          if (name === "live")
            assert.equal(
              await page.locator(".market-row").count(),
              await page.locator(".stake-sparkline").count(),
            );
        }
        if (name === "operating") {
          const chart = page.locator(".staking-chart");
          await chart.waitFor();
          assert.equal(await chart.locator(".trend-ranges button").count(), 5);
          assert(await chart.locator("svg[role=img]").isVisible());
          for (const range of [
            "24H",
            "7D",
            "30D",
            "90D",
            locale === "en" ? "All" : "全部",
          ]) {
            const button = chart.getByRole("button", {
              name: range,
              exact: true,
            });
            await button.click();
            assert.equal(await button.getAttribute("aria-pressed"), "true");
          }
          const graph = chart.locator("svg[role=img]");
          await graph.focus();
          const readout = await graph.getAttribute("data-inspected-index");
          await page.keyboard.press("ArrowLeft");
          assert.notEqual(
            await graph.getAttribute("data-inspected-index"),
            readout,
          );
          const rect = await graph.boundingBox();
          await page.mouse.move(
            rect.x + rect.width * 0.3,
            rect.y + rect.height * 0.4,
          );
          assert.notEqual(
            await graph.getAttribute("data-inspected-index"),
            readout,
          );
          if (width === 390)
            await graph.dispatchEvent("pointermove", {
              pointerType: "touch",
              clientX: rect.x + rect.width * 0.6,
              clientY: rect.y + 40,
            });
        }
        if (
          width === 1440 ||
          (width === 390 &&
            ["launch", "live", "operating", "portfolio"].includes(name))
        ) {
          if (name === "operating")
            await page
              .locator(".trend-ranges")
              .getByRole("button", { name: "7D", exact: true })
              .click();
          await page.locator("main h1").click();
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: `test-results/step8-${name}-${locale}-${width}.png`,
            fullPage: true,
          });
        }
        checks.push(`${locale} ${width} ${name}`);
      }
    }
  }
  await page.evaluate(() => localStorage.setItem("nexns-locale", "zh-CN"));
  await page.goto(base + "/economy/56/" + op);
  const headline = page.locator(".trend-heading [data-value]");
  await page.waitForFunction((key) => {
    const state = JSON.parse(localStorage.getItem("nexus-simulation-v3"));
    return (
      Number(
        document
          .querySelector(".trend-heading [data-value]")
          ?.getAttribute("data-value"),
      ) === state.liveMarket.projects[key].history.at(-1).amount
    );
  }, "56:" + op);
  const logoPath = await page
    .locator(".terminal-logo svg path")
    .first()
    .getAttribute("d");
  const initial = Number(await headline.getAttribute("data-value"));
  const act = async (tab, label, cta, amount) => {
    await page.getByRole("tab", { name: "质押", exact: true }).first().click();
    if (tab === "解除质押")
      await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.getByLabel(label, { exact: true }).fill(amount);
    await page.getByRole("button", { name: cta, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "确认操作", exact: true })
      .click();
    await page.locator(".operation-success").waitFor();
  };
  await act("质押", "质押数量 · SEA", "确认质押", "10");
  assert.equal(Number(await headline.getAttribute("data-value")), initial + 10);
  await act("解除质押", "解除质押数量 · SEA", "确认解除质押", "4");
  assert.equal(Number(await headline.getAttribute("data-value")), initial + 6);
  const path = await page
    .locator(".staking-chart > svg > path")
    .last()
    .getAttribute("d");
  await page.reload();
  await page.waitForFunction(
    (value) =>
      Number(
        document
          .querySelector(".trend-heading [data-value]")
          ?.getAttribute("data-value"),
      ) === value,
    initial + 6,
  );
  assert.equal(
    await page.locator(".terminal-logo svg path").first().getAttribute("d"),
    logoPath,
  );
  assert.equal(Number(await headline.getAttribute("data-value")), initial + 6);
  assert.equal(
    await page.locator(".staking-chart > svg > path").last().getAttribute("d"),
    path,
  );
  checks.push(
    "stake/unstake quantity, chart update, reload and reduced motion",
  );
  await page.goto(base + "/create");
  await page.getByLabel("项目名称", { exact: true }).fill("Logo Preview");
  await page.getByLabel("代币符号", { exact: true }).fill("LGP");
  await page
    .getByLabel("简介", { exact: true })
    .fill("Independent community treasury.");
  await page
    .locator("#create-logo")
    .setInputFiles("test-results/step8-launch-zh-CN-1440.png");
  await page.waitForFunction(
    () => document.querySelector(".logo-upload img")?.naturalWidth > 0,
  );
  const uploaded = await page.locator(".logo-upload img").getAttribute("src");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  assert.equal(
    await page.locator(".wizard-review img").getAttribute("src"),
    uploaded,
  );
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.waitForURL("**/economy/56/0xe*");
  assert.equal(
    await page.locator(".terminal-logo img").getAttribute("src"),
    uploaded,
  );
  await page.reload();
  await page.waitForFunction(
    (src) =>
      document.querySelector(".terminal-logo img")?.getAttribute("src") === src,
    uploaded,
  );
  checks.push(
    "uploaded Logo preview, review, creation and persisted terminal identity",
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/step8-visual-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
