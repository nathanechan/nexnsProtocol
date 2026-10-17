import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
let checks = 0;
const out = "test-results/system-v2";
fs.mkdirSync(out, { recursive: true });
const lum = (color) => {
  const c = color
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3002");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    checks++;
    assert.equal(
      await page
        .locator("body")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--nexns-accent").trim(),
        ),
      "#2464eb",
    );
    checks++;
    await page.locator("#amount").fill("10001");
    assert.equal(
      await page.locator("#amount").getAttribute("aria-invalid"),
      "true",
    );
    checks++;
    await page.locator("#amount").fill("1000");
    assert.equal(
      await page.locator("#amount").getAttribute("aria-invalid"),
      "false",
    );
    checks++;
    await page.locator("#load").click();
    assert.equal(await page.locator("#load").getAttribute("aria-busy"), "true");
    assert(await page.locator("#load").isDisabled());
    checks++;
    assert.equal(
      await page
        .locator(".control-spinner")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    checks++;
    await page.locator("#reset").click();
    assert.equal(await page.locator("#load").isDisabled(), false);
    checks++;
    await page.locator("#open").click();
    await page.getByRole("dialog").waitFor();
    const b = await page.getByRole("dialog").boundingBox();
    assert(b.x >= 0 && b.x + b.width <= width + 1);
    checks++;
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    checks++;
    for (const selector of [
      "#load",
      '.nx-notice[data-tone="warning"]',
      '.nx-notice[data-tone="error"]',
      '.nx-notice[data-tone="success"]',
    ]) {
      const colors = await page
        .locator(selector)
        .first()
        .evaluate((e) => {
          const s = getComputedStyle(e);
          return [s.color, s.backgroundColor];
        });
      const l = colors.map(lum),
        ratio = (Math.max(...l) + 0.05) / (Math.min(...l) + 0.05);
      assert(ratio >= 4.5, selector + " contrast " + ratio);
      checks++;
    }
    if (width === 1440 || width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${out}/guide-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.evaluate(() => {
    document.body.removeAttribute("data-nexns-ui");
    document.querySelector("main").setAttribute("data-nexns-ui", "v2");
  });
  await page.locator("#open").click();
  assert.equal(
    await page
      .locator("dialog")
      .evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--nexns-accent").trim(),
      ),
    "#2464eb",
  );
  checks++;
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
