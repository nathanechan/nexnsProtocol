import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [],
  checks = [];
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const platform = "56:0x" + "f".repeat(40),
  op = "56:0x" + "4".repeat(40);
const snapshot = async () =>
  JSON.parse(
    await page.evaluate(() => localStorage.getItem("nexus-simulation-v3")),
  );
const control = async (key, button) => {
  await page.goto(base + "/simulation-console");
  await page.locator("main select").first().selectOption(key);
  await page.getByRole("button", { name: button, exact: true }).click();
};
const copyCheck = async (label, locale) => {
  await page.locator("main").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    label + " overflow",
  );
  const ui = await page.locator("main").innerText();
  assert.doesNotMatch(
    ui,
    /模拟|演示|Simulation|\bDemo\b|Mock|未建模|最多 100|当前展示排名|NEXUS|P Ecosystem|My NEXNS/,
    label + " development copy",
  );
  if (locale === "en") {
    const data = await snapshot(),
      names = Object.values(data.projects)
        .map((p) => p.name)
        .sort((a, b) => b.length - a.length),
      logos = Object.values(data.projects).map((p) => p.logo);
    const fragments = await page.locator("main").evaluate((root) => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const a = [];
      while (w.nextNode()) {
        const n = w.currentNode;
        if (n.parentElement.closest("[data-user-text],script,style")) continue;
        a.push(n.textContent.trim());
      }
      return a;
    });
    const leftovers = fragments
      .filter(Boolean)
      .filter((t) => !logos.includes(t))
      .map((t) => {
        for (const n of names) t = t.replaceAll(n, "");
        return t;
      })
      .filter((t) => /[\u4e00-\u9fff]/.test(t));
    assert.deepEqual(leftovers, [], label + " mixed English");
  } else
    assert.doesNotMatch(
      ui,
      /Contribution Value|Network Weight|Active Network|Network Reward|Curve Stage|Operating Stage|Position|Portfolio|Overview|Website/,
      label + " mixed Chinese",
    );
  checks.push(label);
};
try {
  await control(platform, "全新曲线");
  await page.goto(base + "/explore?stage=curve");
  await page.locator(".market-row").first().waitFor();
  let first = page.locator(".market-row").first();
  assert((await first.innerText()).includes("NEXNS"));
  assert.equal(await first.locator(".rank").count(), 0);
  checks.push("Curve pin and ordinary rank");
  await control(platform, "运行阶段");
  await page.goto(base + "/explore?stage=curve");
  await page.locator(".market-row").first().waitFor();
  assert.equal(await page.locator(".platform-badge").count(), 0);
  await page.goto(base + "/explore?stage=operating");
  await page.locator(".market-row").first().waitFor();
  first = page.locator(".market-row").first();
  assert((await first.innerText()).includes("NEXNS"));
  assert.equal(await first.locator(".rank").count(), 0);
  checks.push("Operating pin after lifecycle change");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  for (const q of ["0x" + "f".repeat(40), "NEXNS", "NX-PLATFORM"]) {
    await page.getByRole("searchbox", { name: "搜索", exact: true }).fill(q);
    await page.locator(".search-result").first().waitFor();
    assert(
      (await page.locator(".search-result").first().innerText()).includes(
        "NEXNS",
      ),
    );
    checks.push("Platform search " + q);
  }
  await control(op, "01 · 全新发行");
  const fresh = (await snapshot()).projects[
    await page.locator("main select").first().inputValue()
  ];
  await page.goto(
    base + "/economy/" + fresh.chainId + "/" + fresh.tokenContract,
  );
  await copyCheck("Fresh project production copy", "zh-CN");
  await control(op, "07 · 奖励就绪");
  for (const locale of ["zh-CN", "en"]) {
    await page.setViewportSize({ width: 1440, height: 844 });
    await page.locator(".language-switch").selectOption(locale);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of [
        "/network",
        "/explore?stage=curve",
        "/explore?stage=operating",
        "/my-nexus",
        "/p-ecosystem",
        "/protocol",
        "/create",
        "/studio/NX-0001",
        "/economy/56/0x" + "1".repeat(40),
        "/economy/56/0x" + "4".repeat(40),
      ]) {
        await page.goto(base + route);
        await page.locator("h1").waitFor();
        await page.waitForFunction(
          (expected) => document.documentElement.lang === expected,
          locale,
        );
        if (route.startsWith("/explore"))
          await page.locator(".market-row").first().waitFor();
        if (route === "/network")
          await page.locator(".market-row").first().waitFor();
        await copyCheck(`${locale} ${width} ${route}`, locale);
        if (
          route.includes("studio") ||
          route === "/protocol" ||
          route === "/my-nexus" ||
          route.endsWith("4".repeat(40))
        ) {
          const ids = await page
            .locator("main [role=tab]:visible")
            .evaluateAll((els) => els.map((e) => e.id));
          for (const id of ids) {
            await page.locator("[id=" + JSON.stringify(id) + "]").click();
            await copyCheck(`${locale} ${width} ${route} ${id}`, locale);
          }
        }
        if (width === 390 && route.includes("/economy/")) {
          await page.evaluate(() => scrollTo(0, 0));
          const header = await page.locator(".terminal-header").boundingBox();
          assert(header.height <= 125, "compact header");
          const shortcut = page.locator(".terminal-action-jump");
          assert(
            (await shortcut.boundingBox()).y < 500,
            "early action shortcut",
          );
          await shortcut.click();
          if (route.endsWith("1".repeat(40))) {
            const tabs = await page
              .locator(".terminal-actions [role=tablist]")
              .boundingBox();
            const input = await page
              .locator(".trade-preview input")
              .boundingBox();
            assert(tabs.y < 500, "early Buy Sell");
            assert(input.y < 600, "early trade input");
          } else {
            const actions = await page
              .locator(".terminal-actions [role=tablist]")
              .boundingBox();
            const tabs = await page
              .locator(".terminal-actions [role=tablist]")
              .boundingBox();
            assert(actions.y + actions.height < 450, "early operating actions");
            assert(tabs.height < 60, "single row operating tabs");
            await page.locator(".terminal-actions [role=tab]").first().click();
            const market = await page.locator(".terminal-chart").boundingBox();
            assert(market.y < actions.y, "chart before actions with shortcut");
          }
          checks.push(`${locale} mobile priority ${route.slice(-2)}`);
        }
        if (width === 390 && route === "/my-nexus") {
          await page.evaluate(() => scrollTo(0, 0));
          const claim = await page
            .locator(".portfolio-claimable")
            .boundingBox();
          assert(claim.y < 500, "early claimable");
          checks.push(locale + " mobile portfolio");
        }
      }
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/product-correction-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
