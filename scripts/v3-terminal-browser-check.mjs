import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v3-terminal";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [];
try {
  for (const locale of ["zh-CN", "en"])
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
      });
      await context.addInitScript(
        (l) => localStorage.setItem("nexns-locale", l),
        locale,
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      for (const [stage, contract] of [
        ["curve", "0x0000000000000000000000000000000000022c23"],
        ["operating", "0x000000000000000000000000000000000003fc24"],
      ]) {
        await page.goto(`http://localhost:3000/economy/56/${contract}`);
        await page.locator(".terminal-actions input").first().waitFor();
        for (const theme of ["dark", "light"]) {
          if ((await page.locator("html").getAttribute("data-theme")) !== theme)
            await page.locator(".theme-toggle").click();
          await page.waitForTimeout(250);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          checks++;
          assert.equal(await page.locator("h1 [data-token-name]").count(), 0);
          checks++;
          if (stage === "operating") {
            assert.equal(
              await page.locator(".terminal-personal").getAttribute("open"),
              null,
            );
            checks++;
          }
          const cta = page.locator(".terminal-actions .button.primary").first();
          const box = await cta.boundingBox();
          if (width < 900) {
            assert(
              box.y + box.height < 844,
              `${stage} ${width} CTA bottom ${box.y + box.height}`,
            );
            checks++;
          }
          await page.locator(".terminal-actions input").first().fill("10");
          assert.equal(await cta.isEnabled(), true);
          checks++;
          await cta.click();
          await page.getByRole("dialog").waitFor();
          assert(
            (await page.getByRole("dialog").innerText()).includes(
              contract.slice(0, 6),
            ),
          );
          checks++;
          await page.keyboard.press("Escape");
          await page.locator(".terminal-actions input").first().fill("");
          await page.screenshot({
            path: `${out}/${locale}-${width}-${theme}-${stage}.png`,
            fullPage: false,
          });
        }
        if (stage === "operating") {
          for (const tab of [
            locale === "en" ? "Stake" : "质押",
            locale === "en" ? "Claim" : "领取",
          ]) {
            await page
              .locator(".terminal-actions > .product-tabs > .product-tablist")
              .getByRole("tab", { name: tab, exact: true })
              .click();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
            checks++;
            if (width < 900) {
              const box = await page
                .locator(".terminal-actions .button.primary")
                .first()
                .boundingBox();
              assert(box.y + box.height < 844, `${tab} CTA below fold`);
              checks++;
            }
          }
        }
        if (stage === "curve") {
          await page
            .getByRole("button", {
              name: locale === "en" ? "Price history" : "价格走势",
              exact: true,
            })
            .click();
          assert.equal(await page.locator(".quote-empty").count(), 1);
          checks++;
          await page.locator(".terminal-actions input").first().fill("10");
          await page
            .locator(".terminal-actions .button.primary")
            .first()
            .click();
          await page
            .getByRole("dialog")
            .getByRole("button", {
              name: locale === "en" ? "Confirm trade" : "确认交易",
              exact: true,
            })
            .click();
          await page.getByRole("dialog").waitFor({ state: "hidden" });
          assert.equal(await page.locator(".quote-history svg").count(), 1);
          checks++;
          await page.reload();
          await page.locator(".terminal-actions input").first().waitFor();
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            "light",
          );
          checks++;
        }
      }
      await context.close();
    }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
