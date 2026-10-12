import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const checks = [],
  metrics = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const platform = "56:0x" + "f".repeat(40);
const control = async (button) => {
  await page.goto(base + "/simulation-console");
  await page.locator("main select").first().selectOption(platform);
  await page.getByRole("button", { name: button, exact: true }).click();
};
const ready = async () => {
  await page.locator(".market-row").first().waitFor();
  await page.getByRole("status").waitFor({ state: "hidden" });
};
try {
  await control("运行阶段");
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate(
      (locale) => localStorage.setItem("nexns-locale", locale),
      locale,
    );
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["markets", "launch", "live"]) {
        await page.goto(base + "/" + section);
        await ready();
        assert.equal(await page.locator(".economy-card").count(), 0);
        assert.equal(await page.locator("input[type=search]").count(), 0);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        const positions = await page
          .locator(".market-row")
          .evaluateAll((rows) =>
            rows.map((r) => ({
              top: r.getBoundingClientRect().top,
              bottom: r.getBoundingClientRect().bottom,
              height: r.getBoundingClientRect().height,
            })),
          );
        const bottom =
          width > 768
            ? 900
            : (await page.locator(".mobile-primary").boundingBox()).y;
        const visible = positions.filter(
          (r) => r.top >= 0 && r.bottom <= bottom,
        ).length;
        metrics.push({
          locale,
          width,
          section,
          visible,
          rowHeight: positions[0].height,
        });
        assert(
          visible >= (width === 1440 ? 10 : 4),
          `${locale} ${width} ${section}: ${visible} rows`,
        );
        assert(positions[0].height >= (width === 1440 ? 48 : 80));
        if (width === 1440) {
          assert(await page.locator(".market-columns").isVisible());
          const price = page.locator(".market-price").first();
          assert.equal(
            await price.evaluate((e) => getComputedStyle(e).textAlign),
            "right",
          );
        } else
          assert.equal(
            await page.locator(".market-columns").isVisible(),
            false,
          );
        if (section === "launch") {
          assert.equal(
            await page.locator('.market-row[data-stage="OPERATING"]').count(),
            0,
          );
          assert.equal(
            await page.locator(".market-progress-track").first().isVisible(),
            true,
          );
        }
        if (section === "live")
          assert.equal(
            await page.locator('.market-row[data-stage="CURVE_OPEN"]').count(),
            0,
          );
        if (section !== "launch")
          assert.equal(
            await page.locator(".market-row").first().getAttribute("class"),
            "market-row platform-row",
          );
        assert.equal(await page.locator(".rank").count(), 0);
        const select = page.getByRole("combobox", {
          name: locale === "en" ? "Sort by" : "排序方式",
        });
        const options = await select
          .locator("option")
          .evaluateAll((options) => options.map((o) => o.value));
        for (const value of options) {
          await select.selectOption(value);
          await page.waitForURL(`**/${section}?sort=${value}`);
          await ready();
          const state = await page.evaluate(() =>
            JSON.parse(localStorage.getItem("nexus-simulation-v3")),
          );
          const hrefs = await page
            .locator(".market-row")
            .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
          const projects = hrefs.map((h) =>
            Object.values(state.projects).find(
              (p) => h === `/economy/${p.chainId}/${p.tokenContract}`,
            ),
          );
          if (section !== "launch") assert(projects[0].isPlatformToken);
          const data = projects
            .filter((p) => !p.isPlatformToken)
            .map((p) =>
              value === "volume"
                ? p.lifecycle === "CURVE_OPEN"
                  ? p.curve.volume24h
                  : p.operating?.volume24h
                : value === "progress"
                  ? p.curve.progress
                  : value === "participants"
                    ? section === "launch"
                      ? p.curve.participants
                      : p.operating?.activeParticipants
                    : value === "newest"
                      ? Date.parse(p.createdAt)
                      : value === "stage"
                        ? p.lifecycle === "CURVE_OPEN"
                          ? 1
                          : 0
                        : value === "change"
                          ? p.lifecycle === "CURVE_OPEN"
                            ? null
                            : p.operating?.change24h
                          : p.operating?.[value],
            );
          for (let i = 1; i < data.length; i++)
            assert(
              data[i] == null ||
                (data[i - 1] != null && data[i - 1] >= data[i]),
              `${section} ${value} sorting`,
            );
        }
        const target = await page
          .locator(".market-row")
          .first()
          .getAttribute("href");
        await page.locator(".market-row").first().focus();
        assert.equal(
          await page
            .locator(".market-row")
            .first()
            .evaluate((e) => getComputedStyle(e).outlineStyle),
          "solid",
        );
        await page.keyboard.press("Enter");
        await page.waitForURL(base + target);
        await page.locator("h1").waitFor();
        if (section === "launch")
          await page
            .getByRole("tab", {
              name: locale === "en" ? "Buy" : "买入",
              exact: true,
            })
            .waitFor();
        else
          await page
            .getByRole("tab", {
              name: locale === "en" ? "Participate" : "参与",
              exact: true,
            })
            .waitFor();
        await page.goto(base + "/" + section);
        await ready();
        await page.locator(".market-row").last().scrollIntoViewIfNeeded();
        if (width <= 768) {
          await page.evaluate(() =>
            window.scrollTo(0, document.documentElement.scrollHeight),
          );
          const row = await page.locator(".market-row").last().boundingBox();
          assert(
            row.y + row.height <=
              (await page.locator(".mobile-primary").boundingBox()).y,
          );
        }
        await page.evaluate(() => scrollTo(0, 0));
        fs.mkdirSync("test-results", { recursive: true });
        await page.screenshot({
          path: `test-results/market-${locale}-${width}-${section}.png`,
        });
        checks.push(
          `${locale} ${width} ${section}: density/sort/identity/keyboard/deep-link/bottom-nav`,
        );
      }
    }
  }
  await control("全新曲线");
  for (const section of ["markets", "launch"]) {
    await page.goto(base + "/" + section);
    await ready();
    assert(
      (await page.locator(".market-row").first().innerText()).includes("NEXNS"),
    );
  }
  await page.goto(base + "/live");
  await ready();
  assert.equal(await page.locator(".platform-row").count(), 0);
  checks.push("platform Curve lifecycle pin");
  await control("迁移准备");
  for (const section of ["markets", "launch", "live"]) {
    await page.goto(base + "/" + section);
    await ready();
    assert.equal(await page.locator(".platform-row").count(), 0);
  }
  checks.push("migration excluded from market lists");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/market-browser.json",
    JSON.stringify({ passed: true, checks, metrics, errors }, null, 2),
  );
  console.log(
    JSON.stringify({ passed: true, checks: checks.length, metrics, errors }),
  );
} finally {
  await browser.close();
}
