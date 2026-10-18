import { chromium } from "file:///C:/Users/natha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
try {
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(() => localStorage.setItem("nexns-locale", "en"));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(
    "http://localhost:3000/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
  );
  await p.locator(".trading-canvas canvas").first().waitFor();
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      if ((await p.locator("html").getAttribute("data-theme")) !== theme)
        await p.locator(".theme-toggle").click();
      await p.locator(".trading-canvas").scrollIntoViewIfNeeded();
      await p.locator(".trading-canvas").hover();
      await p.mouse.wheel(0, -100);
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({
        path: `test-results/trading-final-${width}-${theme}.png`,
      });
    }
  }
  for (const name of ["5m", "15m", "1h", "1m"]) {
    await p.getByRole("button", { name, exact: true }).click();
    assert.equal(
      await p
        .getByRole("button", { name, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
  }
  await p.getByRole("button", { name: "Staking Trend", exact: true }).click();
  await p.locator(".staking-chart").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Professional chart intervals, zoom, themes, responsive sizes and staking view passed",
  );
  await ctx.close();
} finally {
  await b.close();
}
