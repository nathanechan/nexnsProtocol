import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/market-step3";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const check = (name, value) => {
  assert(value, name);
  checks.push(name);
};
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const section of ["launch", "live"])
      for (const width of [1440, 768, 430, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://localhost:3000/${section}`);
        await page.locator(".market-row").first().waitFor();
        check(
          `${section} ${locale} ${width} fits`,
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        const row = page
          .locator(".market-row")
          .filter({ has: page.locator("[data-token-name]") })
          .first();
        const symbol = await row.locator("[data-token-symbol]").innerText(),
          name = await row.locator("[data-token-name]").innerText();
        check(
          "symbol is primary",
          (await row.locator("strong[data-token-symbol]").count()) === 1,
        );
        check(
          "full name is secondary",
          (await row.locator("small[data-token-name]").count()) === 1 &&
            symbol !== name,
        );
        check("compact comparison row", (await row.boundingBox()).height <= 66);
        check(
          "selected discovery tab",
          (await page.getByRole("tab", { selected: true }).innerText()) ===
            (locale === "en" ? "Hot" : "热门"),
        );
        if ([1440, 390].includes(width))
          await page.screenshot({
            path: `${out}/${section}-${width}-${locale}.png`,
          });
        const route = await row.getAttribute("href");
        await row.click();
        await page.waitForURL(`**${route}`);
        check(
          "terminal primary symbol",
          (await page.locator("h1 [data-token-symbol]").innerText()) === symbol,
        );
        check(
          "terminal full name follows",
          (await page.locator("h1 [data-token-name]").innerText()) === name,
        );
        check(
          "header has no redundant pair",
          !(await page.locator(".terminal-header").innerText()).includes(
            `${symbol}/USDT`,
          ),
        );
        if (section === "live") {
          await page
            .getByRole("tab", {
              name: locale === "en" ? "Stake" : "质押",
              exact: true,
            })
            .first()
            .click();
          check(
            "stake input unit uses symbol",
            (await page
              .getByLabel(
                `${locale === "en" ? "Stake amount" : "质押数量"} · ${symbol}`,
                { exact: true },
              )
              .count()) === 1,
          );
        }
        if (width === 390)
          await page.screenshot({
            path: `${out}/${section}-terminal-${locale}.png`,
          });
      }
    await page.goto("http://localhost:3000/launch");
    await page.keyboard.press("Control+k");
    await page.getByRole("dialog").getByRole("searchbox").fill("FIELD");
    await page.locator(".search-result [data-token-symbol]").first().waitFor();
    check(
      "search leads with symbol",
      (await page
        .locator(".search-result [data-token-symbol]")
        .first()
        .innerText()) === "FIELD",
    );
    check(
      "search retains full name",
      (await page
        .locator(".search-result [data-token-name]")
        .first()
        .innerText()) === "Mireva",
    );
    await page.keyboard.press("Escape");
    await context.close();
  }
  check("no browser errors", errors.length === 0);
  console.log(JSON.stringify({ checks: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
