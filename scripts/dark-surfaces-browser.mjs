import { chromium } from "file:///C:/Users/natha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
let checks = 0;
const errors = [];
const routes = [
  "/launch",
  "/live",
  "/portfolio",
  "/nexns",
  "/protocol",
  "/create",
  "/studio",
  "/network",
];
try {
  for (const [locale, width] of [
    ["en", 1440],
    ["zh-CN", 390],
  ]) {
    const c = await b.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await c.addInitScript((l) => {
      localStorage.setItem("nexns-theme", "dark");
      localStorage.setItem("nexns-locale", l);
    }, locale);
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    for (const route of routes) {
      await p.goto("http://localhost:3000" + route);
      await p.locator('html[data-theme="dark"]').waitFor();
      const bright = await p.locator("body").evaluate((e) => [
        ...new Set(
          [...e.querySelectorAll("*")]
            .filter((n) => {
              const r = n.getBoundingClientRect();
              if (
                r.width < 50 ||
                r.height < 24 ||
                getComputedStyle(n).visibility === "hidden"
              )
                return false;
              const a = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
              return (
                a &&
                a.length >= 3 &&
                a.slice(0, 3).every((v) => Number(v) > 215) &&
                (a.length < 4 || Number(a[3]) > 0.5)
              );
            })
            .map((n) => n.tagName + "." + n.className),
        ),
      ]);
      assert.deepEqual(bright, [], `${route} ${locale} ${width}`);
      checks++;
    }
    const verify = async (name) => {
      const d = p.getByRole("dialog");
      await d.waitFor();
      const style = await d
        .locator(".financial-identity")
        .evaluate((e) => ({
          bg: getComputedStyle(e).backgroundColor,
          dd: getComputedStyle(e.querySelector("dd")).color,
          dt: getComputedStyle(e.querySelector("dt")).color,
        }));
      assert.equal(style.bg, "rgb(25, 28, 35)");
      assert.equal(style.dd, "rgb(245, 247, 251)");
      assert.equal(style.dt, "rgb(161, 167, 182)");
      assert(!(await d.innerText()).includes("参与资金提交后不可作为本金赎回"));
      assert.equal(await d.locator(".principal-notice").count(), 0);
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      checks += 6;
      await p.screenshot({
        path: `test-results/dark-surface-${locale}-${width}-${name}.png`,
      });
    };
    await p.goto(
      "http://localhost:3000/economy/56/0x0000000000000000000000000000000000022c23",
    );
    await p.locator(".terminal-actions input").fill("100");
    await p
      .locator(".terminal-actions")
      .getByRole("button", {
        name: locale === "en" ? "Confirm buy" : "确认买入",
        exact: true,
      })
      .click();
    await verify("buy");
    await p
      .getByRole("dialog")
      .locator(".dialog-actions .button.primary")
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    await p
      .locator(".terminal-actions")
      .getByRole("tab", {
        name: locale === "en" ? "Sell" : "卖出",
        exact: true,
      })
      .click();
    await p.locator(".terminal-actions input").fill("1");
    await p
      .locator(".terminal-actions")
      .getByRole("button", {
        name: locale === "en" ? "Confirm sell" : "确认卖出",
        exact: true,
      })
      .click();
    await verify("sell");
    await p.keyboard.press("Escape");
    await p.goto(
      "http://localhost:3000/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
    );
    for (const name of ["participate", "stake", "unstake", "claim"]) {
      const primary = name === "unstake" ? "stake" : name;
      const label =
        locale === "en"
          ? { participate: "Participate", stake: "Stake", claim: "Claim" }[
              primary
            ]
          : { participate: "参与", stake: "质押", claim: "领取" }[primary];
      await p
        .locator(".terminal-actions > .product-tabs > .product-tablist")
        .getByRole("tab", { name: label, exact: true })
        .click();
      if (name === "unstake")
        await p
          .locator(".terminal-actions")
          .getByRole("tab", {
            name: locale === "en" ? "Unstake" : "解除质押",
            exact: true,
          })
          .click();
      await p.locator(".terminal-actions input:visible").first().fill("1");
      await p.locator(".terminal-actions .operation-confirm").click();
      await verify(name);
      await p.keyboard.press("Escape");
    }
    await p.goto("http://localhost:3000/portfolio");
    await p.locator(".portfolio-claim-row button").first().click();
    const outer = p.locator(".portfolio-claim-form");
    assert.equal(
      await outer.evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(16, 18, 23)",
    );
    await outer.locator("input").fill("1");
    await outer.locator(".operation-confirm").click();
    await verify("portfolio-claim");
    checks++;
    await p.keyboard.press("Escape");
    await p.locator(".theme-toggle").click();
    await outer.locator(".operation-confirm").click();
    const light = p.getByRole("dialog");
    assert.equal(
      await light
        .locator(".financial-identity")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(240, 243, 248)",
    );
    assert.equal(
      await light
        .locator(".financial-identity dd")
        .first()
        .evaluate((e) => getComputedStyle(e).color),
      "rgb(20, 32, 53)",
    );
    checks += 2;
    await p.keyboard.press("Escape");
    await c.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await b.close();
}
