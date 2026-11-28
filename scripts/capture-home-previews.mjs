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
  { locale: 'en', route: 'artists', label: 'desktop', width: 1440, height: 960 },
  { locale: 'ar', route: 'artists', label: 'mobile', width: 390, height: 844 },
  { locale: 'en', route: 'podcasts', label: 'desktop', width: 1440, height: 960 },
  { locale: 'ar', route: 'discover', label: 'mobile', width: 390, height: 844 },
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
      const playerButton = await page
        .locator('.mp2-player-controls > button.mp2-main-play')
        .evaluate((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return {
            background: style.backgroundImage,
            color: style.color,
            width: rect.width,
            height: rect.height,
          };
        });
      const size = width <= 640 ? 44 : 46;
      if (
        !playerButton.background.includes('rgb(52, 119, 132)') ||
        playerButton.color !== 'rgb(255, 255, 255)' ||
        playerButton.width !== size ||
        playerButton.height !== size
      ) {
        throw new Error(
          'Player button styling regression on ' +
            locale +
            '/' +
            label +
            ': ' +
            JSON.stringify(playerButton),
        );
      }
      measurements.push({ locale, label, ...sizes, playerButton });
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
      // Next.js streams a route fallback at domcontentloaded. Capture the
      // actual discovery UI instead of treating its skeleton as the design.
      if (route === 'discover') {
        await page.locator('.oddio-v2-discover .oddio-explore-heading h1').waitFor({
          state: 'visible',
          timeout: 30000,
        });
      }
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
