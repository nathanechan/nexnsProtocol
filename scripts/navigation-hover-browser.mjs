import { chromium } from "file:///C:/Users/natha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
try {
  for (const width of [1440, 390]) {
    const c = await b.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await c.addInitScript(() => localStorage.setItem("nexns-locale", "zh-CN"));
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    p.on("pageerror", (e) => errors.push(e.message));
    for (const route of [
      "/launch",
      "/live",
      "/portfolio",
      "/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
    ]) {
      await p.goto("http://localhost:3000" + route);
      for (const theme of ["dark", "light"]) {
        if ((await p.locator("html").getAttribute("data-theme")) !== theme)
          await p.locator(".theme-toggle").click();
        for (const el of await p
          .locator(
            ".desktop-primary a,.header-actions .button,.theme-toggle,.brand,.language-switch,.mobile-primary a",
          )
          .all()) {
          if (!(await el.isVisible())) continue;
          for (const mode of ["hover", "focus"]) {
            if (mode === "hover") await el.hover();
            else {
              await p.mouse.move(width - 2, 899);
              await p.keyboard.press("Tab");
              await el.focus();
            }
            const state = await el.evaluate((e) => ({
              bg: getComputedStyle(e).backgroundColor,
              color: getComputedStyle(e).color,
              focus: e.matches(":focus-visible"),
            }));
            if (theme === "dark") {
              const rgb = state.bg.match(/[\d.]+/g);
              assert(
                rgb &&
                  Number(rgb[0]) < 80 &&
                  Number(rgb[1]) < 80 &&
                  Number(rgb[2]) < 100,
                `${route} ${await el.innerText()} ${mode} ${state.bg}`,
              );
            }
            assert(state.color !== "rgb(255, 255, 255)");
            checks++;
          }
          await p.mouse.move(width - 2, 899);
          await el.evaluate((e) => e.blur());
        }
        await p.locator(".brand").click();
        for (const link of await p.locator(".product-menu a").all()) {
          await link.hover();
          if (theme === "dark")
            assert.notEqual(
              await link.evaluate((e) => getComputedStyle(e).backgroundColor),
              "rgb(255, 255, 255)",
            );
          checks++;
        }
        await p.keyboard.press("Escape");
        await p.locator(".global-search-trigger").hover();
        await p
          .locator(".app-header")
          .screenshot({
            path: `test-results/nav-hover-${width}-${theme}-${route.split("/")[1]}.png`,
          });
        assert(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        checks++;
      }
    }
    await c.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await b.close();
}
