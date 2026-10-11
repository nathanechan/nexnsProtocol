import fs from "node:fs";
const { chromium } = await import(process.env.NEXUS_PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const result = [];
await page.goto("http://localhost:3000/simulation-console");
await page.getByLabel("选择项目").selectOption("56:0x" + "4".repeat(40));
await page.getByRole("button", { name: "07 · 奖励就绪", exact: true }).click();

for (const locale of ["zh-CN", "en"]) {
  await page.goto("http://localhost:3000/network");
  await page.locator(".language-switch").selectOption(locale);
  for (const route of [
    "/network",
    "/explore",
    "/my-nexus",
    "/p-ecosystem",
    "/protocol",
    "/create",
    "/economy/56/0x" + "1".repeat(40),
    "/studio/NX-0001",
    "/economy/56/0x" + "4".repeat(40),
  ]) {
    await page.goto("http://localhost:3000" + route);
    await page.waitForTimeout(400);
    const capture = async (tab) => {
      const text = await page.locator("main").innerText();
      result.push({
        locale,
        route,
        tab,
        text,
        attrs: await page
          .locator("main [aria-label],main [placeholder]")
          .evaluateAll((els) =>
            els.map(
              (e) =>
                e.getAttribute("aria-label") || e.getAttribute("placeholder"),
            ),
          ),
      });
    };
    await capture("default");
    if (
      route.includes("studio") ||
      route === "/protocol" ||
      route === "/my-nexus" ||
      route.includes("/economy/")
    ) {
      for (const v of await page
        .locator("main [role=tab]")
        .evaluateAll((els) => els.map((e) => e.id))) {
        await page.locator("[id=" + JSON.stringify(v) + "]").click();
        await capture(v);
      }
    }
  }
}
await page.setViewportSize({ width: 390, height: 844 });
for (const route of [
  "/explore",
  "/my-nexus",
  "/economy/56/0x" + "1".repeat(40),
  "/economy/56/0x" + "4".repeat(40),
]) {
  await page.goto("http://localhost:3000" + route);
  await page.waitForTimeout(400);
  await page.screenshot({
    path:
      "test-results/correction-" +
      route.split("/")[1] +
      "-" +
      route.slice(-2) +
      ".png",
    fullPage: true,
  });
  result.push({
    route,
    width: 390,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    header: (await page.locator(".project-header").count())
      ? await page.locator(".project-header").boundingBox()
      : null,
    trade: (await page.locator(".trade-preview").count())
      ? await page.locator(".trade-preview").boundingBox()
      : null,
    actions: (await page.locator(".mobile-core-actions").count())
      ? await page.locator(".mobile-core-actions").boundingBox()
      : null,
  });
}
fs.writeFileSync(
  "tmp/copy-audit.json",
  JSON.stringify(
    {
      result,
      errors,
      identities: Object.values(
        JSON.parse(
          await page.evaluate(() =>
            localStorage.getItem("nexus-simulation-v3"),
          ),
        ).projects,
      ).flatMap((p) => [p.name, p.logo]),
    },
    null,
    2,
  ),
);
await browser.close();
