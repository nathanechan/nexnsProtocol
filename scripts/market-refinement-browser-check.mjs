import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/market-refinement";
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
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        check(
          `${section} ${locale} ${width} overflow`,
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        check(
          "five headers",
          (await page.locator("[role=columnheader]").count()) === 5,
        );
        check(
          "no sort dropdown",
          (await page.locator(".market-toolbar select").count()) === 0,
        );
        check("four tabs", (await page.getByRole("tab").count()) === 4);
        for (const row of await page.locator(".market-row").all()) {
          const box = await row.boundingBox();
          check("compact row", box.height <= 66);
          check(
            "no secondary metrics",
            (await row
              .locator(
                ".market-volume,.market-remaining,.stake-sparkline,.market-contract",
              )
              .count()) === 0,
          );
        }
        for (const sort of [
          "price",
          "change",
          section === "launch" ? "progress" : "staked",
          "users",
        ]) {
          const header = page.locator(`.header-${sort} button`);
          await header.click();
          await page.waitForURL(
            (u) =>
              u.searchParams.get("sort") === sort &&
              u.searchParams.get("dir") === "desc",
          );
          check(
            "descending accessible state",
            (await page
              .locator(`.header-${sort}`)
              .getAttribute("aria-sort")) === "descending",
          );
          await header.click();
          await page.waitForURL((u) => u.searchParams.get("dir") === "asc");
          check(
            "ascending accessible state",
            (await page
              .locator(`.header-${sort}`)
              .getAttribute("aria-sort")) === "ascending",
          );
        }
        if (
          (locale === "zh-CN" && [1440, 390].includes(width)) ||
          (locale === "en" && width === 390)
        )
          await page.screenshot({
            path: `${out}/${section}-${width}-${locale}.png`,
          });
        await page.getByRole("tab").first().click();
        await page.waitForURL((u) => u.searchParams.get("tab") === "watchlist");
        if ((await page.locator(".market-row").count()) === 0)
          check(
            "compact empty watchlist",
            (await page
              .getByText(
                locale === "en" ? "No watchlist items yet" : "暂无自选",
                { exact: true },
              )
              .count()) === 1,
          );
        await page.getByRole("tab").nth(1).click();
        await page.waitForURL((u) => u.searchParams.get("tab") === "hot");
        const star = page.locator(".watch-star").first();
        if ((await star.getAttribute("aria-pressed")) !== "true")
          await star.click();
        await page.getByRole("tab").first().click();
        await page.waitForURL((u) => u.searchParams.get("tab") === "watchlist");
        check(
          "favorite visible",
          (await page.locator(".market-row").count()) > 0,
        );
        await page.reload();
        await page.locator(".market-row").first().waitFor();
        check(
          "favorite persists",
          (await page.locator(".watch-star[aria-pressed=true]").count()) > 0,
        );
        if (width === 390)
          await page.screenshot({
            path: `${out}/${section}-watchlist-${locale}.png`,
          });
        for (const tab of ["new", "all"]) {
          await page
            .getByRole("tab")
            .nth(tab === "new" ? 2 : 3)
            .click();
          await page.waitForURL((u) => u.searchParams.get("tab") === tab);
          check(
            `${tab} result`,
            (await page.locator(".market-row").count()) > 0,
          );
        }
        await page.locator(".market-row").first().click();
        await page.waitForURL("**/economy/**");
        check("canonical navigation", page.url().includes("/economy/56/0x"));
      }
    await context.close();
  }
  check("no browser errors", errors.length === 0);
  console.log(JSON.stringify({ checks: checks.length, errors }, null, 2));
} finally {
  await browser.close();
}
