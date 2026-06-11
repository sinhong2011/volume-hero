import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extPath = path.resolve(__dirname, "../.output/chrome-mv3");

const browser = await chromium.launchPersistentContext("", {
  headless: true,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
  ],
});

// Wait for extension to load and get ID from background service worker
let extId;
const timeout = Date.now() + 5000;
while (!extId && Date.now() < timeout) {
  await new Promise((r) => setTimeout(r, 300));
  for (const worker of browser.serviceWorkers()) {
    const url = worker.url();
    if (url.startsWith("chrome-extension://")) {
      extId = url.split("/")[2];
      break;
    }
  }
  if (!extId) {
    for (const page of browser.backgroundPages()) {
      const url = page.url();
      if (url.startsWith("chrome-extension://")) {
        extId = url.split("/")[2];
        break;
      }
    }
  }
}

// Fallback: open chrome://extensions to find the ID
if (!extId) {
  const extPage = await browser.newPage();
  await extPage.goto("chrome://extensions");
  await extPage.waitForLoadState("domcontentloaded");
  // Try to enable dev mode and get the extension ID
  extId = await extPage.evaluate(() => {
    const manager = document.querySelector("extensions-manager");
    const shadow = manager?.shadowRoot;
    const itemList = shadow?.querySelector("extensions-item-list");
    const listShadow = itemList?.shadowRoot;
    const item = listShadow?.querySelector("extensions-item");
    return item?.getAttribute("id") || null;
  });
  await extPage.close();
}

if (!extId) {
  console.error("Could not find extension ID");
  await browser.close();
  process.exit(1);
}

console.log("Extension ID:", extId);

const page = await browser.newPage();
await page.setViewportSize({ width: 320, height: 600 });
await page.goto(`chrome-extension://${extId}/popup.html`);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({
  path: path.resolve(__dirname, "../.store-assets/preview-popup.png"),
});
console.log("Popup screenshot saved");

const optPage = await browser.newPage();
await optPage.setViewportSize({ width: 900, height: 700 });
await optPage.goto(`chrome-extension://${extId}/options.html`);
await new Promise((r) => setTimeout(r, 2000));
await optPage.screenshot({
  path: path.resolve(__dirname, "../.store-assets/preview-options.png"),
});
console.log("Options screenshot saved");

await browser.close();
