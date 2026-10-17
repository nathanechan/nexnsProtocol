import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const errors = [],
  checks = [];
try {
  const context = await browser.newContext();
  for (const path of [
    "/simulation-console",
    "/visual-preview",
    "/visual-preview/components",
    "/design-system",
  ]) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 404, path);
    checks.push(path + " hidden in production");
  }
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/launch",
    "/live",
    "/portfolio",
    "/create",
    "/protocol",
    "/nexns",
    "/studio/NX-0001",
  ]) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200, path);
    await page.locator("h1").waitFor();
    assert.equal(
      await page
        .locator('a[href*="visual-preview"],a[href*="simulation-console"]')
        .count(),
      0,
    );
    checks.push(path + " available without test controls");
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: checks.length, errors }));
} finally {
  await browser.close();
}
