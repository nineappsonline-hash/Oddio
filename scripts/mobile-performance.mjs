import { chromium, devices } from 'playwright';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  reducedMotion: 'reduce',
});
try {
  const page = await context.newPage();
  const failures = [];
  await page.addInitScript(() => {
    window.__oddioPerf = { lcp: null, cls: 0, longTasks: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__oddioPerf.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__oddioPerf.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        window.__oddioPerf.longTasks += list.getEntries().length;
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // Browser metric observers are optional.
    }
  });
  page.on('pageerror', (error) => failures.push(error.message));
  const started = Date.now();
  const response = await page.goto(new URL('/en', base).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  if (!response?.ok()) throw new Error(`Mobile homepage HTTP ${response?.status()}`);
  await page.locator('main').waitFor({ timeout: 20_000 });
  const firstMain = Date.now() - started;
  await page.waitForLoadState('load', { timeout: 30_000 });
  await page.waitForTimeout(1000);
  const report = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const nextScripts = resources.filter(
      (r) =>
        r.name.includes('/_next/static/') &&
        (r.name.includes('.js') || r.initiatorType === 'script'),
    );
    const transferred = (items) =>
      Math.round(items.reduce((sum, item) => sum + (item.transferSize || 0), 0) / 1024);
    return {
      navigationMs: nav ? Math.round(nav.duration) : null,
      ttfbMs: nav ? Math.round(nav.responseStart) : null,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      totalRequests: resources.length,
      jsRequests: nextScripts.length,
      jsTransferKiB: transferred(nextScripts),
      totalTransferKiB: transferred(resources),
      images: resources.filter((item) => item.initiatorType === 'img').length,
      viewportWidth: window.innerWidth,
      fcpMs: Math.round(
        performance
          .getEntriesByType('paint')
          .find((item) => item.name === 'first-contentful-paint')?.startTime || 0,
      ),
      lcpMs: window.__oddioPerf?.lcp == null ? null : Math.round(window.__oddioPerf.lcp),
      cls: Number((window.__oddioPerf?.cls ?? 0).toFixed(3)),
      longTasks: window.__oddioPerf?.longTasks ?? 0,
    };
  });
  console.log(
    JSON.stringify(
      {
        route: '/en',
        device: 'iPhone 13 emulation',
        mainVisibleMs: firstMain,
        ...report,
        pageErrors: failures,
      },
      null,
      2,
    ),
  );
  if (!report.viewportWidth || report.viewportWidth > 500) {
    throw new Error('Mobile viewport emulation did not apply');
  }
  // Initial baseline is observational: budgets must be calibrated against
  // repeated runs and field Core Web Vitals before gating releases.
} finally {
  await browser.close();
}
