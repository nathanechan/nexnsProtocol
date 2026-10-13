import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = "http://localhost:3000",
  out = "test-results/final-ui-cleanup";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const check = (label, condition) => {
  assert(condition, label);
  checks.push(label);
};
try {
  for (const locale of ["zh-CN", "en"]) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await context.addInitScript(
      (l) => localStorage.setItem("nexns-locale", l),
      locale,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    for (const width of [1440, 768, 390, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/live");
      await page.locator(".market-row").first().waitFor();
      await page.waitForFunction(
        (l) => document.documentElement.lang === l,
        locale,
      );
      check(
        `Live ${locale} ${width} overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(
        await page.locator(".market-columns > span").allTextContents(),
        locale === "en"
          ? ["Token", "Price", "Change", "Staked", "Users"]
          : ["项目", "价格", "涨跌", "质押", "人数"],
      );
      checks.push(`Live ${locale} ${width} five headers`);
      check(
        "no legacy sort dropdown",
        (await page.locator(".market-toolbar select").count()) === 0,
      );
      const rows = page.locator(".market-row");
      for (const index of [0, 1, 2]) {
        const row = rows.nth(index);
        const identity = await row.locator(".market-identity").boundingBox(),
          price = await row.locator(".reference-price").boundingBox();
        check(`Live ${locale} ${width} row ${index} price`, !!price);
        const staked = await row.locator(".market-staked").boundingBox(),
          users = await row.locator(".market-participants").boundingBox(),
          box = await row.boundingBox();
        check(
          `Live ${locale} ${width} row ${index} identity/price paired`,
          Math.abs(
            identity.y + identity.height / 2 - price.y - price.height / 2,
          ) < 4 && price.x >= identity.x + identity.width - 1,
        );
        check(
          `Live ${locale} ${width} row ${index} single horizontal metrics`,
          Math.abs(price.y + price.height / 2 - staked.y - staked.height / 2) <
            2 &&
            Math.abs(staked.y - users.y) < 2 &&
            staked.x >= price.x + price.width - 1 &&
            users.x >= staked.x + staked.width - 1,
        );
        check(
          `Live ${locale} ${width} row ${index} removed secondary metrics`,
          (await row
            .locator(
              ".market-metric,.market-volume,.market-liquidity,.stake-sparkline",
            )
            .count()) === 0,
        );
        check(`Live ${locale} ${width} row ${index} compact`, box.height <= 66);
      }
      for (const sort of ["price", "staked", "users"]) {
        await page.locator(`.header-${sort} button`).click();
        await page.waitForURL((u) => u.searchParams.get("sort") === sort);
        await page.waitForTimeout(150);
        const values = await page
          .locator(".market-row:not(.platform-row)")
          .evaluateAll(
            (els, kind) =>
              els.map((e) =>
                kind === "users"
                  ? Number(
                      e.querySelector(".market-participants .market-value")
                        .textContent,
                    )
                  : Number(
                      e
                        .querySelector(
                          kind === "price"
                            ? ".reference-price [data-value]"
                            : ".market-staked [data-value]",
                        )
                        ?.getAttribute("data-value") ?? -1,
                    ),
              ),
            sort,
          );
        check(
          `Live ${locale} ${width} ${sort} sort order`,
          values.every((v, i) => i === 0 || values[i - 1] >= v),
        );
      }
      if (
        (locale === "zh-CN" && [1440, 390, 430].includes(width)) ||
        (locale === "en" && width === 390)
      )
        await page.screenshot({
          path: `${out}/live-${width}-${locale}.png`,
          fullPage: false,
        });
      await rows.nth(1).click();
      await page.locator(".staking-chart").waitFor();
      check(
        `Live ${locale} ${width} row tap`,
        page.url().includes("/economy/56/"),
      );
    }
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/portfolio");
      await page.locator(".summary-strip").waitFor();
      await page.waitForFunction(
        (l) => document.documentElement.lang === l,
        locale,
      );
      check(
        `Portfolio ${locale} ${width} zero copy`,
        await page
          .getByText(
            locale === "en"
              ? "No claimable assets right now"
              : "当前暂无可领取资产",
            { exact: true },
          )
          .isVisible(),
      );
      check(
        `Portfolio ${locale} ${width} no empty Claim`,
        (await page.locator(".portfolio-claim-row button").count()) === 0,
      );
      assert.deepEqual(
        await page.locator(".summary-strip dt").allTextContents(),
        locale === "en"
          ? ["Assets", "Position", "Staked", "Claimable", "Projects"]
          : ["Token资产", "仓位", "质押", "可领取", "项目"],
      );
      checks.push(`Portfolio ${locale} ${width} order`);
      const claim = await page.locator(".summary-claimable").evaluate((e) => ({
          bg: getComputedStyle(e).backgroundColor,
          size: parseFloat(getComputedStyle(e.querySelector("dd")).fontSize),
        })),
        token = await page
          .locator(".summary-tokens dd")
          .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      check(
        `Portfolio ${locale} ${width} calm zero`,
        claim.bg === "rgba(0, 0, 0, 0)" && claim.size <= token,
      );
      check(
        `Portfolio ${locale} ${width} labels paired with values`,
        await page
          .locator(".summary-strip > div")
          .evaluateAll((els) =>
            els.every(
              (e) =>
                Math.abs(
                  e.querySelector("dt").getBoundingClientRect().x -
                    e.querySelector("dd").getBoundingClientRect().x,
                ) < 2,
            ),
          ),
      );
      check(
        `Portfolio ${locale} ${width} overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width === 390) {
        const boxes = await page
          .locator(".summary-strip > div")
          .evaluateAll((els) =>
            els.map((e) => ({
              x: e.getBoundingClientRect().x,
              y: e.getBoundingClientRect().y,
            })),
          );
        check(
          `Portfolio ${locale} ${width} two/three grid`,
          boxes[0].y === boxes[1].y &&
            boxes[2].y > boxes[0].y &&
            boxes[2].y === boxes[3].y &&
            boxes[3].y === boxes[4].y,
        );
      }
      if (
        (locale === "zh-CN" && [1440, 390].includes(width)) ||
        (locale === "en" && width === 390)
      )
        await page.screenshot({
          path: `${out}/portfolio-${width}-${locale}.png`,
          fullPage: false,
        });
    }
    // Seed through existing hidden QA controls; normal product contains no fixture controls.
    const key = "56:0x" + "4".repeat(40);
    await page.goto(base + "/simulation-console");
    await page.locator("main select").first().selectOption(key);
    await page
      .getByRole("button", {
        name: "可领取",
        exact: true,
      })
      .click();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/portfolio");
      await page.locator(".portfolio-claim-row").first().waitFor();
      check(
        `Portfolio ${locale} ${width} no valuation helper`,
        !(await page.locator("main").innerText()).includes(
          locale === "en"
            ? "Values use available reference prices"
            : "资产估值按可用参考价展示",
        ),
      );
      check(
        `Portfolio ${locale} ${width} positive Claim`,
        await page.locator(".portfolio-claim-row button").first().isVisible(),
      );
      check(
        `Portfolio ${locale} ${width} claim grid`,
        await page
          .locator(".portfolio-claim-row")
          .first()
          .evaluate((e) => getComputedStyle(e).display === "grid"),
      );
      check(
        `Portfolio ${locale} ${width} positive logo and amount`,
        (await page.locator(".portfolio-claim-row .token-mark").count()) > 0 &&
          (await page
            .locator(".portfolio-claim-amount strong")
            .first()
            .isVisible()),
      );
      check(
        `Portfolio ${locale} ${width} positive overflow`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width === 390)
        await page.screenshot({
          path: `${out}/portfolio-claimable-390-${locale}.png`,
          fullPage: false,
        });
    }
    const snapshot = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("nexus-simulation-v3")),
      );
    const before = await snapshot(),
      wallet = before.currentUser.wallet,
      balanceKey = key;
    await page.locator(".portfolio-claim-row button").first().click();
    await page
      .getByRole("button", {
        name: locale === "en" ? "Max" : "使用全部",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: locale === "en" ? "Confirm claim" : "确认领取",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: locale === "en" ? "Confirm action" : "确认操作",
        exact: true,
      })
      .click();
    await page.locator(".portfolio-claim-receipt").waitFor();
    const after = await snapshot(),
      previous = before.operatingBooks[key].members[wallet],
      next = after.operatingBooks[key].members[wallet],
      claimResult = after.operatingBooks[key].claims.at(-1);
    check(
      `Portfolio ${locale} successful Claim copy`,
      (await page.locator(".portfolio-claim-receipt").innerText()).includes(
        locale === "en" ? "Claim successful · Received" : "领取成功 · 实际到账",
      ),
    );
    check(
      `Portfolio ${locale} actual token receipt`,
      BigInt(after.exactBalances[balanceKey]) -
        BigInt(before.exactBalances[balanceKey] || "0") ===
        BigInt(claimResult.received),
    );
    check(
      `Portfolio ${locale} claimed/claimable`,
      next.claimable === "0" &&
        BigInt(next.lifetimeClaimed) - BigInt(previous.lifetimeClaimed) ===
          BigInt(previous.claimable),
    );
    check(
      `Portfolio ${locale} row/action removed`,
      (await page.locator(".portfolio-claim-row").count()) === 0,
    );
    check(
      `Portfolio ${locale} summary refreshed`,
      (await page.locator(".summary-claimable dd").innerText()) === "0 USDT",
    );
    await page.screenshot({
      path: `${out}/portfolio-claim-success-390-${locale}.png`,
      fullPage: false,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ checks: checks.length, passed: checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
