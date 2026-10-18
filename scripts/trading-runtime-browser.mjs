import { chromium } from "file:///C:/Users/natha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
try {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(() => localStorage.setItem("nexns-locale", "en"));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const key = "56:0xffffffffffffffffffffffffffffffffffffffff";
  await p.goto(
    "http://localhost:3000/economy/56/0xffffffffffffffffffffffffffffffffffffffff",
  );
  await p.locator(".trading-canvas canvas").first().waitFor();
  const saved = () =>
    p.evaluate(() => JSON.parse(localStorage.getItem("nexus-simulation-v3")));
  let s = await saved();
  const wallet = s.currentUser.wallet;
  assert(
    Object.values(s.operatingBooks).filter((b) => b.presentationClock).length >=
      3,
  );
  assert(BigInt(s.operatingBooks[key].members[wallet].claimable) > 0n);
  const elapsed = s.operatingBooks[key].presentationClock.elapsedMs;
  await p.waitForFunction(
    ({ key, elapsed }) =>
      JSON.parse(localStorage.getItem("nexus-simulation-v3")).operatingBooks[
        key
      ].presentationClock.elapsedMs !== elapsed,
    { key, elapsed },
    { timeout: 6000 },
  );
  const act = async (tab, amount) => {
    await p
      .locator(".terminal-actions")
      .getByRole("tab", { name: tab, exact: true })
      .click();
    await p.locator(".terminal-actions input:visible").first().fill(amount);
    await p.locator(".terminal-actions .operation-confirm").click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
  };
  const bal = BigInt(
    s.exactBalances["56:0xffffffffffffffffffffffffffffffffffffffff"],
  );
  await act("Claim", "1");
  s = await saved();
  assert(
    BigInt(s.exactBalances["56:0xffffffffffffffffffffffffffffffffffffffff"]) >
      bal,
  );
  assert(s.operatingBooks[key].claims.length > 0);
  const staked = BigInt(s.operatingBooks[key].members[wallet].staked);
  await act("Stake", "10");
  s = await saved();
  assert.equal(
    BigInt(s.operatingBooks[key].members[wallet].staked),
    staked + 10000000000000000000n,
  );
  const lots = s.operatingBooks[key].members[wallet].lots.length;
  await act("Participate", "10");
  s = await saved();
  assert.equal(s.operatingBooks[key].members[wallet].lots.length, lots + 1);
  const settlements = s.operatingBooks[key].settlements.length;
  console.log(
    "Claim, stake, participate, token balances and per-second preview passed; waiting for automatic settlement",
  );
  await p.waitForFunction(
    ({ key, count }) =>
      JSON.parse(localStorage.getItem("nexus-simulation-v3")).operatingBooks[
        key
      ].settlements.length > count,
    { key, count: settlements },
    { timeout: 75000 },
  );
  s = await saved();
  const count = s.operatingBooks[key].claims.length;
  await act("Claim", "1");
  s = await saved();
  assert.equal(s.operatingBooks[key].claims.length, count + 1);
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      if ((await p.locator("html").getAttribute("data-theme")) !== theme)
        await p.locator(".theme-toggle").click();
      await p.locator(".trading-canvas").scrollIntoViewIfNeeded();
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({
        path: `test-results/trading-runtime-${width}-${theme}.png`,
      });
    }
  }
  await p.getByRole("button", { name: "5m", exact: true }).click();
  await p.getByRole("button", { name: "Reset view", exact: true }).click();
  await p.reload();
  await p.locator(".trading-canvas canvas").first().waitFor();
  s = await saved();
  assert.equal(s.operatingBooks[key].claims.length, count + 1);
  assert.deepEqual(errors, []);
  console.log(
    "Automatic settlement, repeat claim, refresh persistence, desktop/mobile light/dark and professional chart checks passed",
  );
  await ctx.close();
} finally {
  await b.close();
}
