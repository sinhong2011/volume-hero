import { chromium } from "playwright-core";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Renders every *.html in .store-assets/ to a same-named .png at the exact
// pixel size of <body> (read from its inline width/height). Output is a flat
// 24-bit PNG with no alpha channel, as required by the Chrome Web Store.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../.store-assets");

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""));

const browser = await chromium.launch({ headless: true });
// deviceScaleFactor:1 so a 1280x800 body exports as exactly 1280x800 px,
// which is what the Chrome Web Store requires for screenshots.
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const name of targets) {
  const htmlPath = path.join(dir, `${name}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`skip ${name}: no html`);
    continue;
  }
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  // Wait for webfonts so text metrics are final.
  await page.evaluate(() => document.fonts.ready);
  const { w, h } = await page.evaluate(() => {
    const b = document.body;
    return { w: b.offsetWidth, h: b.offsetHeight };
  });
  await page.setViewportSize({ width: w, height: h });
  const out = path.join(dir, `${name}.png`);
  // omitBackground:false keeps an opaque background (no alpha) so the
  // exported PNG has no transparency layer.
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log(`rendered ${name}.png  ${w}x${h}`);
}

await browser.close();
