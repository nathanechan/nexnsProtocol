import fs from "node:fs";
const { chromium } = await import(
  process.env.NEXUS_PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = "test-results/v3-audit";
fs.mkdirSync(out, { recursive: true });
const records = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const route of [
      "/launch",
      "/live",
      "/portfolio",
      "/create",
      "/protocol",
      "/nexns",
      "/economy/56/0x000000000000000000000000000000000003fc24",
      "/economy/56/0x0000000000000000000000000000000000022c23",
    ]) {
      await page.goto("http://localhost:3000" + route);
      await page.locator("main").waitFor();
      const name = route.split("/").at(-1);
      await page.screenshot({
        path: `${out}/${width}-${name}.png`,
        fullPage: true,
      });
      records.push({
        route,
        width,
        ...(await page.evaluate(() => ({
          headings: [...document.querySelectorAll("main h1,main h2")].map(
            (e) => e.textContent,
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
          actions: [...document.querySelectorAll("main button")]
            .slice(0, 12)
            .map((e) => ({
              text: e.textContent,
              y: Math.round(e.getBoundingClientRect().y),
            })),
        }))),
      });
    }
    await page.close();
  }
  fs.writeFileSync(`${out}/inventory.json`, JSON.stringify(records, null, 2));
  console.log(
    JSON.stringify({
      pages: records.length,
      overflows: records.filter((r) => r.overflow),
    }),
  );
} finally {
  await browser.close();
}
