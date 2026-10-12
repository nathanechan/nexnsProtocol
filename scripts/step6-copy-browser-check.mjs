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
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/simulation-console");
  await page.getByLabel("选择项目").selectOption("56:0x" + "1".repeat(40));
  await page.getByRole("button", { name: "运行阶段", exact: true }).click();
  await page.goto(base + "/portfolio");
  await page.locator(".summary-strip").waitFor();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nexus-simulation-v3")),
  );
  const projects = Object.values(state.projects);
  const curve = projects.find(
    (p) => p.lifecycle === "CURVE_OPEN" && !p.isPlatformToken,
  );
  const live = projects.find(
    (p) => p.lifecycle === "OPERATING" && !p.isPlatformToken,
  );
  const terminal = (p) => `/economy/${p.chainId}/${p.tokenContract}`;
  const routes = [
    "/launch",
    "/live",
    "/portfolio",
    "/create",
    "/nexns",
    "/protocol",
    `/studio/${curve.projectId}`,
    terminal(curve),
    terminal(live),
  ];
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate((l) => localStorage.setItem("nexns-locale", l), locale);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(base + route);
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        await page.locator("main h1").waitFor();
        assert.equal(await page.locator("footer").count(), 0);
        assert.equal(await page.locator(".mobile-primary a").count(), 3);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        if (!route.startsWith("/studio") && route !== "/protocol") {
          const text = await page.locator("main").innerText();
          assert.doesNotMatch(
            text,
            /头寸|昨日已结算|累计毛收益|当前理论日率|今日展示进度|当前资格|有活跃容量|最近更新|运行中|价格有效|Price valid|Yesterday settled|Lifetime gross rewards/,
          );
          assert.equal(
            await page
              .locator(".badge.operating, .badge.curve_open, .price-valid")
              .count(),
            0,
          );
        }
        checks.push(`${locale} ${width} ${route}`);
      }
      await page
        .getByRole("button", {
          name: locale === "en" ? "Product menu" : "产品菜单",
        })
        .click();
      assert.deepEqual(
        await page.locator("#product-menu a").allTextContents(),
        locale === "en"
          ? ["NEXNS", "Protocol", "Create", "Manage"]
          : ["NEXNS", "协议", "创建", "管理"],
      );
      await page.keyboard.press("Escape");
      await page.goto(base + terminal(live));
      await page
        .getByLabel(
          locale === "en" ? "Participation amount · USDT" : "参与金额 · USDT",
          { exact: true },
        )
        .fill("100");
      assert.equal(
        await page.locator(".terminal-actions .principal-notice").count(),
        0,
      );
      await page
        .getByRole("button", {
          name: locale === "en" ? "Confirm participation" : "确认参与",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.equal(await dialog.locator(".principal-notice").count(), 1);
      assert.equal(
        await dialog
          .locator(".financial-identity")
          .getAttribute("data-contract"),
        live.tokenContract,
      );
      assert(
        (await dialog.innerText()).includes(
          locale === "en"
            ? "cannot be redeemed as principal"
            : "参与资金提交后不可作为本金赎回。",
        ),
      );
      await page.keyboard.press("Escape");
      checks.push(`${locale} ${width} menu and confirmation boundary`);
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/step6-copy-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
