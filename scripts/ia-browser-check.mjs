import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const routes = ["/markets", "/launch", "/live", "/portfolio"];
const snapshot = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("nexus-simulation-v3")));
const visibleNav = (width, locale) =>
  page.getByRole("navigation", {
    name:
      width > 768
        ? locale === "en"
          ? "Primary navigation"
          : "主导航"
        : locale === "en"
          ? "Bottom navigation"
          : "底部导航",
  });
try {
  await page.goto(base + "/");
  await page.waitForURL("**/launch");
  checks.push("root redirects to launch");
  await page.goto(base + "/simulation-console");
  await page.getByRole("button", { name: "全新曲线", exact: true }).click();
  for (const [old, target] of [
    ["/network", "/markets"],
    ["/explore", "/launch"],
    ["/explore?stage=operating&sort=volume", "/live?sort=volume"],
    ["/my-nexus", "/portfolio"],
    ["/p-ecosystem", "/nexns"],
  ]) {
    await page.goto(base + old);
    await page.waitForURL(base + target);
    assert.equal(
      new URL(page.url()).pathname + new URL(page.url()).search,
      target,
    );
    checks.push("legacy " + old);
  }
  await page.goto(base + "/explore?stage=operating&q=NEXNS");
  await page.waitForURL(base + "/live?q=NEXNS");
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.getByRole("searchbox").inputValue(), "NEXNS");
  await page.locator(".search-result").first().waitFor();
  await page.keyboard.press("Escape");
  checks.push("legacy search query uses global search");
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate(
      (locale) => localStorage.setItem("nexns-locale", locale),
      locale,
    );
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (let i = 0; i < routes.length; i++) {
        await page.goto(base + routes[i]);
        await page.locator("h1").waitFor();
        const nav = visibleNav(width, locale);
        await nav.waitFor({ state: "visible" });
        assert.deepEqual(
          await nav.getByRole("link").allTextContents(),
          locale === "en"
            ? ["Launch", "Live", "Portfolio"]
            : ["发行", "运行", "资产"],
        );
        assert.equal(
          routes[i] === "/markets"
            ? null
            : await nav.locator('[aria-current="page"]').getAttribute("href"),
          routes[i] === "/markets" ? null : routes[i],
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert((await page.locator(".app-header").boundingBox()).height < 85);
        const snapshotBefore = await snapshot();
        await page
          .getByRole("button", {
            name: locale === "en" ? "Search" : "搜索",
            exact: true,
          })
          .click();
        const search = page.getByRole("dialog");
        await search.waitFor();
        const target = Object.values(snapshotBefore.projects).find(
          (p) => !p.isPlatformToken,
        );
        const input = search.getByRole("searchbox");
        for (const query of [
          target.tokenContract,
          target.projectId,
          target.symbol,
          target.name,
          target.creatorWallet,
        ]) {
          await input.fill(query);
          await search
            .locator(
              `a[href='/economy/${target.chainId}/${target.tokenContract}']`,
            )
            .first()
            .waitFor();
        }
        await page.keyboard.press("Escape");
        await search.waitFor({ state: "hidden" });
        assert.deepEqual(
          (await snapshot()).exactBalances,
          snapshotBefore.exactBalances,
        );
        if (i < 3) {
          await page.locator(".market-row").first().waitFor();
          const state = await snapshot();
          const actual = await page
            .locator("a.market-row")
            .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
          const expected = Object.values(state.projects)
            .filter((p) =>
              i === 0
                ? ["CURVE_OPEN", "OPERATING"].includes(p.lifecycle)
                : p.lifecycle === (i === 1 ? "CURVE_OPEN" : "OPERATING"),
            )
            .map((p) => `/economy/${p.chainId}/${p.tokenContract}`);
          assert.deepEqual(actual.sort(), expected.sort());
        }
        checks.push(
          `${locale} ${width} ${routes[i]} nav/state/search/scope/overflow`,
        );
      }
      await page
        .getByRole("button", {
          name: locale === "en" ? "Product menu" : "产品菜单",
        })
        .click();
      const menu = page.locator("#product-menu");
      for (const href of ["/nexns", "/protocol", "/create"])
        assert.equal(await menu.locator(`a[href='${href}']`).count(), 1);
      await menu
        .getByRole("combobox")
        .selectOption(locale === "en" ? "zh-CN" : "en");
      assert.equal(
        await page.evaluate(() => localStorage.getItem("nexns-locale")),
        locale === "en" ? "zh-CN" : "en",
      );
      await menu.getByRole("combobox").selectOption(locale);
      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "hidden" });
      checks.push(`${locale} ${width} logo menu and persisted language`);
    }
  }
  const platform = "56:0x" + "f".repeat(40);
  for (const [button, route, absent] of [
    ["全新曲线", "/launch", "/live"],
    ["运行阶段", "/live", "/launch"],
  ]) {
    await page.goto(base + "/simulation-console");
    await page.locator("main select").first().selectOption(platform);
    await page.getByRole("button", { name: button, exact: true }).click();
    await page.goto(base + route);
    await page.locator(".market-row").first().waitFor();
    assert(
      (await page.locator(".market-row").first().innerText()).includes("NEXNS"),
    );
    assert.equal(
      await page.locator(".market-row").first().locator(".rank").count(),
      0,
    );
    await page.goto(base + absent);
    assert.equal(
      await page
        .locator(`a.market-row[href='/economy/56/0x${"f".repeat(40)}']`)
        .count(),
      0,
    );
    checks.push("platform lifecycle pin " + route);
  }
  await page.goto(base + "/economy/56/0x" + "1".repeat(40));
  await page.locator("h1").waitFor();
  assert.equal(new URL(page.url()).pathname, "/economy/56/0x" + "1".repeat(40));
  checks.push("canonical deep link stable");
  assert.deepEqual(errors, []);
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(
    "test-results/ia-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
