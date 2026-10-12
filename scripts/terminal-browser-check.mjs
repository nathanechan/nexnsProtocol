import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = process.env.NEXUS_BASE_URL || "http://localhost:3000";
const key = "56:0x" + "1".repeat(40),
  url = base + "/economy/56/0x" + "1".repeat(40);
const checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const seed = async (button) => {
  await page.goto(base + "/simulation-console");
  await page.locator("main select").first().selectOption(key);
  await page.getByRole("button", { name: button, exact: true }).click();
};
try {
  await page.goto(base + "/");
  await page.waitForURL("**/launch");
  checks.push("root launch");
  for (const locale of ["zh-CN", "en"]) {
    await page.evaluate(
      (locale) => localStorage.setItem("nexns-locale", locale),
      locale,
    );
    for (const stage of ["curve", "ready", "migrating", "operating"]) {
      await seed(
        {
          curve: "全新曲线",
          ready: "迁移准备",
          migrating: "迁移处理中",
          operating: "运行阶段",
        }[stage],
      );
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await page.locator("h1").waitFor();
        await page.waitForTimeout(200);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${locale} ${stage} ${width} overflow`,
        );
        const nav = page.getByRole("navigation", {
          name:
            width > 768
              ? locale === "en"
                ? "Primary navigation"
                : "主导航"
              : locale === "en"
                ? "Bottom navigation"
                : "底部导航",
        });
        assert.deepEqual(
          await nav.getByRole("link").allTextContents(),
          locale === "en"
            ? ["Launch", "Live", "Portfolio"]
            : ["发行", "运行", "资产"],
        );
        assert.equal(
          await page.locator(".terminal-switcher").isVisible(),
          width === 1440,
        );
        const header = await page.locator(".terminal-header").boundingBox();
        assert(header.height < 145);
        if (stage === "curve") {
          const buy = page.getByRole("tab", {
            name: locale === "en" ? "Buy" : "买入",
            exact: true,
          });
          assert((await buy.boundingBox()).y < 500);
          assert(
            (await page.getByRole("textbox").first().boundingBox()).y < 620,
          );
          assert.equal(await page.locator(".curve-chart").count(), 1);
          if (width <= 768)
            assert(
              (await page.locator(".terminal-market-strip").boundingBox()).y <
                (await buy.boundingBox()).y,
            );
        } else if (stage === "operating") {
          const tabs = page.getByRole("tablist", {
            name: locale === "en" ? "Terminal actions" : "终端操作",
          });
          assert.equal(await tabs.getByRole("tab").count(), 3);
          assert((await tabs.boundingBox()).y < 430);
          for (const name of locale === "en"
            ? ["Participate", "Stake", "Claim"]
            : ["参与", "质押", "领取"]) {
            await tabs.getByRole("tab", { name, exact: true }).click();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
            );
          }
          await tabs
            .getByRole("tab", {
              name: locale === "en" ? "Participate" : "参与",
              exact: true,
            })
            .click();
          if (width <= 768)
            assert(
              (await page.locator(".terminal-actions").boundingBox()).y <
                (await page.locator(".terminal-workspace").boundingBox()).y,
            );
        } else
          assert.equal(
            await page
              .getByRole("button", {
                name: /确认交易|确认参与|Confirm trade|Confirm participate/,
              })
              .count(),
            0,
          );
        fs.mkdirSync("test-results", { recursive: true });
        await page.screenshot({
          path: `test-results/terminal-${locale}-${width}-${stage}.png`,
        });
        checks.push(`${locale} ${stage} ${width} layout/nav/actions`);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed("全新曲线");
  await page.goto(url);
  await page
    .locator(".terminal-switcher")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("searchbox").fill("NX-0002");
  await page.locator(".search-result").first().waitFor();
  await page.keyboard.press("Escape");
  checks.push("switcher reuses global search");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/terminal-browser.json",
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors }));
} finally {
  await browser.close();
}
