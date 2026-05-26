import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const htmlPath = resolve(root, 'research/swatches/layout.html');
const outDir = resolve(root, 'docs/assets');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.VIGIL_CHROME ?? '/etc/profiles/per-user/jyj/bin/google-chrome',
});
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('file://' + htmlPath);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);

const screens = await page.locator('.screen').all();
for (let i = 0; i < screens.length; i++) {
  const out = resolve(outDir, `swatch-screen-${i + 1}.png`);
  await screens[i].screenshot({ path: out });
  console.log('wrote', out);
}

await browser.close();
