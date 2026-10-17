import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/terminal-step4";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const check = (name, value) => {
  assert(value, name);
  checks.push(name);
};
try {
  for (const locale of ["zh-CN", "en"]) {
    const zh = locale === "zh-CN";
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 768, 430, 390])
      for (const stage of ["curve", "operating"]) {
        await page.setViewportSize({ width, height: 900 });
        const token =
          stage === "curve"
            ? "0x" + "1".repeat(40)
            : "0x000000000000000000000000000000000003fc24";
        await page.goto("http://localhost:3000/economy/56/" + token);
        await page.locator(".terminal-actions").waitFor();
        check(
          `${locale} ${width} ${stage} fits`,
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        check(
          "no permanent switcher",
          (await page
            .locator(".terminal-layout .terminal-switcher")
            .count()) === 0,
        );
        check(
          "symbol and name only",
          (await page.locator("h1 [data-token-symbol]").count()) === 1 &&
            !(await page.locator(".terminal-header").innerText()).includes(
              "/USDT",
            ),
        );
        const graph = page.locator(".terminal-chart").first(),
          actions = page.locator(".terminal-actions");
        if (width > 900)
          check(
            "desktop chart and actions paired",
            (await actions.boundingBox()).x >
              (await graph.boundingBox()).x +
                (await graph.boundingBox()).width -
                1,
          );
        else {
          check(
            "mobile chart fills canvas",
            Math.abs(
              (await graph.boundingBox()).width -
                (await actions.boundingBox()).width,
            ) < 2,
          );
          check(
            "mobile stage-specific priority",
            stage === "operating"
              ? (await actions.boundingBox()).y < (await graph.boundingBox()).y
              : (await graph.boundingBox()).y < (await actions.boundingBox()).y,
          );
          await page.locator(".terminal-action-jump").click();
          check(
            "actions shortcut reaches form",
            (await actions.boundingBox()).y < 200,
          );
        }
        check(
          "amount field remains usable",
          await actions.locator("input").first().isVisible(),
        );
        if ([1440, 390].includes(width)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: `${out}/${stage}-${width}-${locale}.png`,
          });
          await actions.screenshot({
            path: `${out}/${stage}-actions-${width}-${locale}.png`,
          });
        }
        await page
          .getByRole("button", {
            name: zh ? "切换项目" : "Switch project",
            exact: true,
          })
          .click();
        const dialog = page.getByRole("dialog");
        await dialog.locator(".switcher-row").first().waitFor();
        check(
          "switcher available at every width",
          await dialog.locator(".terminal-switcher").isVisible(),
        );
        check(
          "switcher stage correct",
          (await dialog
            .getByRole("tab", {
              name:
                stage === "curve"
                  ? zh
                    ? "发行"
                    : "Launch"
                  : zh
                    ? "运行"
                    : "Live",
              exact: true,
            })
            .getAttribute("aria-selected")) === "true",
        );
        await dialog.locator('.switcher-row[aria-current="page"]').click();
        await dialog.waitFor({ state: "hidden" });
        check(
          "choosing current project dismisses switcher",
          (await page.getByRole("dialog").count()) === 0,
        );
        await page
          .getByRole("button", {
            name: zh ? "切换项目" : "Switch project",
            exact: true,
          })
          .click();
        if (width === 430) await page.keyboard.press("Control+k");
        else
          await dialog
            .getByRole("button", { name: zh ? "搜索" : "Search", exact: true })
            .click();
        await page
          .getByRole("dialog", { name: zh ? "搜索" : "Search", exact: true })
          .waitFor();
        check(
          "switcher hands off to global search",
          (await page.getByRole("dialog").count()) === 1,
        );
        await page.keyboard.press("Escape");
      }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("http://localhost:3000/economy/56/0x" + "1".repeat(40));
    await page
      .getByLabel(zh ? "支付金额 · USDT" : "Pay amount · USDT", { exact: true })
      .fill("100");
    await page
      .getByRole("button", {
        name: zh ? "确认买入" : "Confirm buy",
        exact: true,
      })
      .click();
    const review = page.getByRole("dialog");
    check(
      "review retains contract",
      (await review
        .locator(".financial-identity")
        .getAttribute("data-contract")) ===
        "0x" + "1".repeat(40),
    );
    await page.screenshot({ path: `${out}/confirmation-390-${locale}.png` });
    await review
      .getByRole("button", {
        name: zh ? "确认交易" : "Confirm trade",
        exact: true,
      })
      .click();
    const pending = page.getByRole("button", {
      name: zh ? "处理中…" : "Processing…",
      exact: true,
    });
    if (await pending.count()) {
      check("pending protected", await pending.isDisabled());
      check(
        "close disabled during processing",
        await review
          .getByRole("button", { name: zh ? "关闭" : "Close", exact: true })
          .isDisabled(),
      );
    }
    await page.locator(".operation-success").waitFor();
    check(
      "success feedback",
      await page.locator(".operation-success").isVisible(),
    );
    await context.close();
  }
  check("no browser errors", errors.length === 0);
  console.log(JSON.stringify({ checks: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
