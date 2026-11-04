// Genera le icone PNG da assets/icon.svg usando il Chromium di Playwright.
// Uso (solo sviluppo, non serve per la build): node scripts/render-icons.mjs
// Richiede Playwright installato globalmente; i PNG generati sono già nel repo.
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright è installato a livello globale (non è una dipendenza del progetto).
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = readFileSync(new URL('../assets/icon.svg', import.meta.url), 'utf8');
const outDir = new URL('../public/icon/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const size of [16, 32, 48, 96, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: new URL(`${size}.png`, outDir).pathname, omitBackground: true });
  await page.close();
}
await browser.close();
console.log('Icone generate in public/icon/');
