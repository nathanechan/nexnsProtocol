import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000/create");
  await page.locator("#create-name").fill("V3 Acceptance Economy");
  await page.locator("#create-symbol").fill("V3QA");
  await page.locator("#create-description").fill("Brand text stays unchanged.");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  assert(
    (await page.locator(".wizard-review").innerText()).includes(
      "V3 Acceptance Economy",
    ),
  );
  checks++;
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  assert.equal(
    await page.locator("#create-description").inputValue(),
    "Brand text stays unchanged.",
  );
  checks++;
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.waitForURL(/\/economy\/56\/0x/);
  assert.equal(
    await page.locator("h1 [data-token-symbol]").innerText(),
    "V3QA",
  );
  checks++;
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  checks++;
  await page.locator(".terminal-actions input").first().fill("20");
  await page.locator(".terminal-actions .button.primary").first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认交易", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  checks++;
  await page.goto("http://localhost:3000/portfolio");
  await page.locator(".portfolio-project-rows").waitFor();
  assert((await page.locator("main").innerText()).includes("V3QA"));
  checks++;
  assert(
    !(await page.locator("main").innerText()).includes("V3 Acceptance Economy"),
  );
  checks++;
  for (const theme of ["dark", "light"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.locator(".theme-toggle").click();
    assert.equal(
      await page
        .locator(".compact-results td")
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      theme === "dark" ? "rgb(16, 18, 23)" : "rgb(255, 255, 255)",
    );
    checks++;
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    checks++;
    await page.screenshot({
      path: `test-results/v3-site/positive-portfolio-${theme}.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
