import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const address = (d) => "0x" + d.repeat(40);
const routes = [
  "/network",
  "/explore?stage=curve&sort=progress",
  "/explore?stage=operating&sort=tvl",
  ...["1", "2", "3", "4"].map((d) => "/economy/56/" + address(d)),
];
const results = [];
fs.mkdirSync("test-results", { recursive: true });
try {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [i, route] of routes.entries()) {
      const response = await page.goto(base + route);
      await page.locator("h1").waitFor();
      if (route === "/network")
        await page.locator(".leader-row").first().waitFor();
      if (route.startsWith("/explore"))
        await page.locator(".economy-card").first().waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow || response.status() !== 200)
        throw new Error(
          `${width} ${route} overflow=${overflow} status=${response.status()}`,
        );
      results.push({ width, route, overflow, status: response.status() });
      await page.screenshot({
        path: `test-results/step2-${width}-${i}.png`,
        fullPage: false,
      });
    }
    await page.goto(base + "/explore?stage=curve&sort=progress");
    await page.locator(".economy-card").first().waitFor();
    if ((await page.locator(".economy-card").count()) !== 16)
      throw new Error("Curve discovery count");
    await page.getByRole("tab", { name: "运行中 · Operating Stage" }).click();
    await page.waitForURL("**/explore?stage=operating&sort=tvl");
    await page.locator(".operating-primary").first().waitFor();
    if ((await page.locator(".economy-card").count()) !== 16)
      throw new Error("Operating discovery count");
    await page
      .getByRole("combobox", { name: "项目排序方式" })
      .selectOption("marketCap");
    await page.waitForURL("**sort=marketCap");
    await page.goBack();
    await page.waitForURL("**stage=operating&sort=tvl");
    await page.goBack();
    await page.waitForURL("**stage=curve&sort=progress");
    const input = page.locator(".explore-search input");
    await input.pressSequentially("SEA", { delay: 70 });
    await page.locator(".search-result").nth(1).waitFor();
    await page.waitForURL("**q=SEA");
    if ((await input.inputValue()) !== "SEA")
      throw new Error("Search typing lost input");
    await page.reload();
    await page.locator(".search-result").nth(1).waitFor();
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("searchbox").fill("SEA");
    await dialog.locator(".search-result").nth(1).waitFor();
    if ((await dialog.locator(".search-result").count()) !== 2)
      throw new Error("Duplicate disambiguation");
    await page.screenshot({
      path: `test-results/step2-search-${width}.png`,
      fullPage: false,
    });
    await dialog.getByRole("searchbox").press("ArrowDown");
    const focus = await page.evaluate(() =>
      document.activeElement.classList.contains("result-link"),
    );
    if (!focus) throw new Error("Keyboard search focus");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/economy/56/" + address("4"));
    if (await page.getByRole("dialog").count())
      throw new Error("Search dialog did not close");
    const tab = page.getByRole("tab", { name: "总览", exact: true });
    await tab.focus();
    await page.keyboard.press("ArrowRight");
    if (
      (await page
        .getByRole("tab", { name: "参与", exact: true })
        .getAttribute("aria-selected")) !== "true"
    )
      throw new Error("Operating tab keyboard semantics");
    await page.getByRole("tab", { name: "总览", exact: true }).click();
    await page
      .getByRole("button", { name: `复制合约地址 ${address("4")}` })
      .first()
      .click();
    if (
      (await page.evaluate(() => navigator.clipboard.readText())) !==
      address("4")
    )
      throw new Error("Contract copy");
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Escape");
    if (await page.getByRole("dialog").count()) throw new Error("Escape close");
  }
  const response = await page.goto(base + "/economy/56/" + address("9"));
  await page.getByText("未找到页面或经济体").waitFor();
  if (response.status() !== 404)
    throw new Error("Unknown contract HTTP status");
  if (errors.length) throw new Error(errors.join("\n"));
  fs.writeFileSync(
    "test-results/step2-browser-check.json",
    JSON.stringify(
      {
        results,
        keyboardSearch: true,
        copy: true,
        backNavigation: true,
        urlRefresh: true,
        tabs: true,
        unknown404: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${results.length} responsive routes, URL refresh/back, shared search keyboard navigation, ARIA tabs, clipboard, 404; no page errors`,
  );
} finally {
  await browser.close();
}
