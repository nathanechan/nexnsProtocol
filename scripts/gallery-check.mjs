import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const results = [];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto("http://localhost:3000/design-system");
    await page
      .getByRole("heading", { name: "设计系统", exact: true })
      .waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow || response.status() !== 200)
      throw new Error("Gallery layout failed");
    results.push({ width, status: response.status(), overflow });
  }
  await page.getByRole("button", { name: "打开对话框" }).click();
  await page.keyboard.press("Tab");
  const trapped = await page.evaluate(
    () => !!document.activeElement.closest('[role="dialog"]'),
  );
  await page.keyboard.press("Escape");
  const restored = await page
    .getByRole("button", { name: "打开对话框" })
    .evaluate((el) => el === document.activeElement);
  if (!trapped || !restored) throw new Error("Dialog keyboard focus failed");
  fs.mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/gallery-390.png",
    fullPage: true,
  });
  console.log(JSON.stringify({ results, trapped, restored }));
} finally {
  await browser.close();
}
