import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext(),
  page = await context.newPage();
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000",
  key = "56:0x" + "1".repeat(40),
  platform = "56:0x" + "f".repeat(40),
  checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const control = async (k, button) => {
  await page.goto(base + "/simulation-console");
  await page.locator("main select").first().selectOption(k);
  await page.getByRole("button", { name: button, exact: true }).click();
};
const check = async (label, locale) => {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    label + " overflow",
  );
  assert.equal(await page.locator("h1").count(), 1);
  const ui = await page.locator("main").innerText();
  assert.doesNotMatch(
    ui,
    /Simulation|\bDemo\b|Mock|My NEXNS|P Ecosystem|Explore|Keeper|Oracle control|执行财库|回购触发|执行队列|模拟|演示/,
    label + " legacy/internal copy",
  );
  if (locale === "en") {
    const leftovers = await page.locator("main").evaluate((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
        bad = [];
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.parentElement.closest("[data-user-text],script,style")) continue;
        if (/[\u4e00-\u9fff]/.test(n.textContent))
          bad.push(n.textContent.trim());
      }
      return bad;
    });
    assert.deepEqual(leftovers, [], label + " English residue");
  }
  checks.push(label);
};
try {
  await control(key, "运行阶段");
  await control(key, "07 · 奖励就绪");
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate((l) => localStorage.setItem("nexns-locale", l), locale);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/portfolio",
        "/nexns",
        "/protocol",
        "/studio/NX-0001",
        "/create",
      ]) {
        await page.goto(base + route);
        await page.locator("h1").waitFor();
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        await check(`${locale} ${width} ${route}`, locale);
        await page.screenshot({
          path: `test-results/secondary-${locale}-${width}-${route.slice(1).replaceAll("/", "-")}.png`,
          fullPage: true,
        });
        if (route === "/portfolio") {
          assert.equal(await page.locator(".summary-strip > div").count(), 5);
          assert.equal(await page.getByRole("tab").count(), 7);
          const link = page.locator(".portfolio-project-rows a").first();
          assert.match(
            await link.getAttribute("href"),
            /^\/economy\/56\/0x[0-9a-f]{40}$/,
          );
          if (width === 390) {
            const summary = await page.locator(".summary-strip").boundingBox(),
              tabs = await page.getByRole("tablist").boundingBox(),
              projects = await link.boundingBox();
            assert(summary.y < 200);
            assert(tabs.height < 60);
            assert(projects.y < 650);
            const order = await page
              .locator(".summary-strip > div")
              .evaluateAll((els) =>
                els.map((e) => ({
                  name: e.className,
                  y: e.getBoundingClientRect().y,
                })),
              );
            assert(
              order.find((e) => e.name === "summary-claimable").y <=
                order.find((e) => e.name === "summary-position").y,
            );
          }
        }
        if (["/portfolio", "/protocol", "/studio/NX-0001"].includes(route)) {
          const tabs = await page.getByRole("tab").all();
          assert.equal(
            tabs.length,
            route === "/portfolio" ? 7 : route === "/protocol" ? 6 : 10,
          );
          for (const tab of tabs) {
            await tab.click();
            await check(
              `${locale} ${width} ${route} ${await tab.innerText()}`,
              locale,
            );
          }
          await page.getByRole("tab").first().focus();
          await page.keyboard.press("ArrowRight");
          assert.equal(
            await page.getByRole("tab").nth(1).getAttribute("aria-selected"),
            "true",
          );
        }
      }
      await page.goto(base + "/portfolio");
      await page
        .getByRole("button", {
          name: locale === "en" ? "Product menu" : "产品菜单",
        })
        .click();
      for (const href of ["/nexns", "/protocol", "/create"])
        assert.equal(
          await page.locator(`#product-menu a[href="${href}"]`).count(),
          1,
        );
      await page.locator('#product-menu a[href="/create"]').click();
      await page.waitForURL("**/create");
      checks.push(`${locale} ${width} menu Create routing`);
    }
  }
  for (const [button, route] of [
    ["全新曲线", "/launch"],
    ["运行阶段", "/live"],
  ]) {
    await control(platform, button);
    await page.goto(base + route);
    await page.locator(".market-row").first().waitFor();
    assert(
      (await page.locator(".market-row").first().innerText()).includes("NEXNS"),
    );
    await page.goto(base + "/nexns");
    assert.equal(
      await page
        .getByRole("link", { name: /NEXNS.*Terminal|NEXNS.*终端/ })
        .getAttribute("href"),
      "/economy/56/0x" + "f".repeat(40),
    );
    assert.doesNotMatch(await page.locator("main").innerText(), /NEXNS\/NEXNS/);
    checks.push("NEXNS lifecycle " + button);
  }
  await page.goto(base + "/portfolio");
  await page.getByRole("tab", { name: /Positions|头寸/, exact: true }).click();
  await page
    .locator('.compact-results a[href$="?tab=positions"]')
    .first()
    .click();
  await page.waitForURL("**/economy/**?tab=positions");
  assert.equal(
    await page
      .getByRole("tab", { name: /Positions|头寸/, exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  checks.push("Portfolio to Positions detail");
  await page.goto(base + "/portfolio");
  await page.getByRole("tab", { name: /Rewards|奖励/, exact: true }).click();
  const claim = page.getByRole("link", { name: /Go to Claim|去领取/ }).last();
  await claim.click();
  await page.waitForURL("**/economy/**?tab=claim");
  await page.getByRole("tab", { name: /Claim|领取/, exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: /Claim|领取/, exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  checks.push("Portfolio to Claim action");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/secondary-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
