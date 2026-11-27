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

const browseVariants = [
  { locale: 'ar', route: 'discover', label: 'desktop', width: 1440, height: 960 },
  { locale: 'ar', route: 'podcasts', label: 'mobile', width: 390, height: 844 },
  { locale: 'en', route: 'search', label: 'desktop', width: 1440, height: 960 },
  { locale: 'en', route: 'genres', label: 'mobile', width: 390, height: 844 },
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
      const petrol = await page
        .locator('.mp2-player-controls > button.mp2-main-play')
        .evaluate((button) => {
          const gradient = getComputedStyle(button).backgroundImage;
          const rgb = gradient.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return rgb
            ? {
                red: Number(rgb[1]),
                green: Number(rgb[2]),
                blue: Number(rgb[3]),
                gradient,
              }
            : null;
        });
      if (
        !petrol ||
        petrol.green < petrol.red + 20 ||
        Math.abs(petrol.blue - petrol.green) > 22
      ) {
        throw new Error(
          `Petrol player theme regression on ${locale}/${label}: ${JSON.stringify(petrol)}`,
        );
      }
      measurements.push({ locale, label, ...sizes, petrolPlayer: petrol });
      process.stdout.write(`Captured ${locale}/${label}: overflow=${sizes.overflow}px\n`);
    } finally {
      await context.close();
    }
  }
  for (const { locale, route, label, width, height } of browseVariants) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(`${base}/${locale}/${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      if (response?.status() !== 200) {
        throw new Error(`Unexpected ${locale}/${route} HTTP ${response?.status()}`);
      }
      await page.locator('.mp2-header').waitFor({ state: 'visible' });
      await page.locator('.mp2-player').waitFor({ state: 'visible' });
      await page.screenshot({
        path: `${output}/${locale}-${route}-${label}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        playerBottom: Math.round(
          window.innerHeight -
            document.querySelector('.mp2-player').getBoundingClientRect().bottom,
        ),
        navItems: document.querySelectorAll('.mp2-sidebar a[aria-current="page"]').length,
      }));
      if (geometry.overflow > 2 || Math.abs(geometry.playerBottom) > 2) {
        throw new Error(
          `Layout regression on ${locale}/${route}: ${JSON.stringify(geometry)}`,
        );
      }
      measurements.push({ locale, route, label, ...geometry });
      process.stdout.write(`Captured ${locale}/${route}/${label}\n`);
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
