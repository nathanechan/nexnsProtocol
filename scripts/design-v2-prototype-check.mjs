import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/design-v2-prototypes";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [];
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const design of ["a", "b"])
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
      await page.goto(
        `http://localhost:3001/02-flagship-prototypes.html?design=${design}`,
      );
      assert.equal(
        await page.locator(".product").getAttribute("data-design"),
        design,
      );
      checks++;
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${design} ${width} overflow`,
      );
      checks++;
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `${out}/${design}-${width}-normal.png`,
          fullPage: true,
        });
      await page.locator("#amount").fill("99999");
      await page.locator("#amount").dispatchEvent("input");
      assert(await page.locator("#confirm").isDisabled());
      checks++;
      await page.locator("#amount").fill("1000");
      await page.locator("#amount").dispatchEvent("input");
      await page.locator("#confirm").click();
      await page.locator("dialog").waitFor();
      assert.match(
        await page.locator("#dialog-note").innerText(),
        /不可作为本金赎回/,
      );
      await page.keyboard.press("Escape");
      checks++;
      for (const state of ["claim", "empty", "protected"]) {
        await page.locator("#scenario").selectOption(state);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        checks++;
        if (state === "claim") {
          assert.equal(
            await page.locator(".receive dd").innerText(),
            "13.6 FIELD",
          );
          assert.equal(await page.locator("#confirm").isDisabled(), false);
          checks++;
        }
        if (state === "empty") {
          assert.equal(await page.locator(".chart-empty").isVisible(), true);
          checks++;
        }
        if (state === "protected") {
          assert.equal(await page.locator("#confirm").isDisabled(), true);
          assert.equal(await page.locator(".safety").isVisible(), true);
          checks++;
        }
        if (width === 1440 || width === 390) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: `${out}/${design}-${width}-${state}.png`,
            fullPage: true,
          });
        }
      }
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
