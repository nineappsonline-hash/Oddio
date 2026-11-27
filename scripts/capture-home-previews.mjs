import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3100';
const output = process.env.ODDIO_SCREENSHOT_DIR ?? 'artifacts/oddio-magicpath';
const variants = [
  { locale: 'ar', label: 'desktop', width: 1440, height: 960 },
  { locale: 'en', label: 'desktop', width: 1440, height: 960 },
  { locale: 'ar', label: 'mobile', width: 390, height: 844 },
  { locale: 'en', label: 'mobile', width: 390, height: 844 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (const { locale, label, width, height } of variants) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(`${base}/${locale}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      if (response?.status() !== 200) {
        throw new Error(`Unexpected ${locale} homepage HTTP ${response?.status()}`);
      }
      await page.locator('.oddio-magicpath-home').waitFor({ state: 'visible' });
      await page.locator('.mp2-player').waitFor({ state: 'visible' });
      await page.screenshot({
        path: `${output}/${locale}-${label}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      const sizes = await page.evaluate(() => {
        const bounds = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        };
        return {
          viewport: window.innerWidth,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          hero: bounds('.oddio-v2-cinematic-hero'),
          bottomPlayer: bounds('.mp2-player'),
          sidebar: bounds('.mp2-sidebar'),
          rail: bounds('.mp2-listening'),
          header: bounds('.mp2-header'),
        };
      });
      measurements.push({ locale, label, ...sizes });
      process.stdout.write(`Captured ${locale}/${label}: overflow=${sizes.overflow}px\n`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/measurements.json`,
  JSON.stringify(measurements, null, 2) + '\n',
);
