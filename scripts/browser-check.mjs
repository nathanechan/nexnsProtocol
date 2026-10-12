import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage();
  const results = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  fs.mkdirSync("test-results", { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/network",
      "/explore",
      "/my-nexus",
      "/p-ecosystem",
      "/protocol",
      "/create",
      "/studio/NX-0001",
      ...["1", "2", "3", "4", "5"].map((d) => "/economy/56/0x" + d.repeat(40)),
    ]) {
      const response = await page.goto("http://localhost:3000" + route);
      await page.locator("h1").waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow || response.status() !== 200)
        throw new Error(
          `${width} ${route} overflow=${overflow} status=${response.status()}`,
        );
      results.push({ width, route, overflow, status: response.status() });
    }
    await page.goto("http://localhost:3000/network");
    await page.screenshot({
      path: `test-results/network-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByRole("searchbox").fill("SEA");
    if ((await page.locator(".search-result").count()) !== 2)
      throw new Error("Duplicate search results missing");
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error("Search overflow");
    await page.screenshot({
      path: `test-results/search-${width}.png`,
      fullPage: true,
    });
    const focusInside = await page.evaluate(
      () => !!document.activeElement.closest('[role="dialog"]'),
    );
    if (!focusInside) throw new Error("Dialog focus missing");
    await page.keyboard.press("Escape");
    if (await page.getByRole("dialog").count())
      throw new Error("Escape failed");
    await page.getByRole("button", { name: "连接钱包", exact: true }).click();
    await page.keyboard.press("Escape");
  }
  const missing = await page.goto(
    "http://localhost:3000/economy/56/0x" + "9".repeat(40),
  );
  await page.getByText("未找到页面或经济体").waitFor();
  if (missing.status() !== 404) throw new Error("Unknown project should 404");
  const gallery = await page.goto("http://localhost:3000/design-system");
  if (gallery.status() !== 404)
    throw new Error("Gallery exposed in production");
  await page.goto("http://localhost:3000/");
  if (!page.url().endsWith("/network")) throw new Error("Root redirect failed");
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(
    "test-results/browser-check.json",
    JSON.stringify(
      {
        results,
        unknownProject: 404,
        productionGallery: 404,
        rootRedirect: true,
        dialogFocus: true,
        escapeClose: true,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${results.length} responsive route checks, search, dialogs, 404s, redirect; no page errors`,
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
