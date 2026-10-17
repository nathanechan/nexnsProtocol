import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/account-step5";
fs.mkdirSync(out, { recursive: true });
const errors = [],
  checks = [];
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    for (const width of [1440, 768, 430, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/portfolio",
        "/create",
        "/studio/NX-0001",
        "/protocol",
        "/nexns",
      ]) {
        await page.goto(base + route);
        await page.waitForFunction(
          (l) => document.documentElement.lang === l,
          locale,
        );
        await page.locator(".secondary-page h1").waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${locale} ${width} ${route} overflow`,
        );
        const surface = page
          .locator(
            ".secondary-page .card, .secondary-page .summary-strip, .secondary-page .compact-results",
          )
          .first();
        await surface.waitFor();
        assert.equal(
          await surface.evaluate((e) => getComputedStyle(e).borderTopWidth),
          "1px",
        );
        checks.push(`${locale} ${width} ${route} bounded shared surface`);
        if (route === "/create") {
          assert.equal(
            await page.locator('.wizard-steps [aria-current="step"]').count(),
            1,
          );
          await page
            .getByLabel(locale === "en" ? "Project Name" : "项目名称", {
              exact: true,
            })
            .fill("North Field");
          await page
            .getByLabel(locale === "en" ? "Token Symbol" : "代币符号", {
              exact: true,
            })
            .fill("FIELD");
          await page.locator(".wizard-actions button").last().click();
          assert.equal(
            await page
              .locator(".wizard-steps li")
              .nth(1)
              .getAttribute("aria-current"),
            "step",
          );
          await page.locator(".wizard-actions button").last().click();
          assert.equal(
            await page
              .locator(".wizard-steps li")
              .nth(2)
              .getAttribute("aria-current"),
            "step",
          );
          assert.match(
            await page.locator(".wizard-review").innerText(),
            /North Field/,
          );
          await page.locator(".wizard-actions button").first().click();
          await page.locator(".wizard-actions button").first().click();
          assert.equal(
            await page.locator(".identity-fields input").first().inputValue(),
            "North Field",
          );
          checks.push(
            `${locale} ${width} creation progress and retained inputs`,
          );
        }
        if ([1440, 390].includes(width)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: `${out}/${locale}-${width}-${route.slice(1).replaceAll("/", "-")}.png`,
            fullPage: true,
          });
        }
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${out}/report.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks: checks.length, errors }));
} finally {
  await browser.close();
}
