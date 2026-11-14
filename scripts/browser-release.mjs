#!/usr/bin/env node
/**
 * Browser-level release smoke tests (demo-only). Checks UI interactivity,
 * route integrity, focus, RTL and responsive layout. This does NOT validate
 * real Supabase/R2 account flows or audible audio playback.
 */
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const engines = { chromium, firefox, webkit };
const engine = process.env.BROWSER_ENGINE || 'chromium';
if (!(engine in engines)) throw new Error('Unsupported browser test engine');
const browser = await engines[engine].launch({ headless: true });
let failures = 0;
const tests = [];
async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: 'PASS' });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures++;
    tests.push({ name, status: 'FAIL' });
    process.stderr.write(
      `FAIL ${name}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

try {
  for (const locale of ['en', 'ar']) {
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const label = `${engine}/${locale}/${viewport.width === 390 ? 'mobile' : 'desktop'}`;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await test(`${label} editorial home layout and viewport`, async () => {
        const response = await page.goto(`${base}/${locale}`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        await page.locator('.oddio-home-feature-grid').waitFor();
        assert.equal(await page.locator('.oddio-featured-stage').count(), 1);
        assert.equal(await page.locator('.oddio-topbar-search').count(), 1);
        assert.equal(await page.locator('.oddio-listening-rail').count(), 1);
        assert.equal(
          await page.locator('.oddio-listening-rail').isVisible(),
          viewport.width >= 1320,
          'Listening rail visibility does not match the desktop breakpoint',
        );
        assert.equal(
          await page.locator('.oddio-topbar-search').isVisible(),
          viewport.width >= 1024,
          'Persistent search should appear on desktop, not inside mobile chrome',
        );
        await page.locator('.oddio-idle-player').waitFor({ state: 'visible' });
        assert.equal(await page.locator('.oddio-home-intro h1').count(), 1);
        assert.equal(await page.locator('.oddio-home-dashboard').count(), 1);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `home layout horizontal overflow: ${overflow}px`);
        assert.equal(pageErrors.length, 0, pageErrors.join('; '));
      });

      await test(`${label} soundspace controls`, async () => {
        const response = await page.goto(`${base}/${locale}/soundspace`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        assert.equal(await page.locator('html').getAttribute('lang'), locale);
        assert.equal(
          await page.locator('html').getAttribute('dir'),
          locale === 'ar' ? 'rtl' : 'ltr',
        );
        await page.getByRole('heading', { level: 1 }).waitFor();
        const surpriseLabel = locale === 'ar' ? 'فاجئني' : 'Surprise me';
        const surprise = page.getByRole('button', { name: surpriseLabel, exact: true });
        await surprise.click();
        assert.equal(await surprise.getAttribute('aria-pressed'), 'true');
        const focusLabel =
          locale === 'ar' ? 'وضع الاستماع الهادئ' : 'Distraction-free mode';
        await page.getByRole('button', { name: focusLabel }).click();
        const restoreLabel = locale === 'ar' ? 'إظهار الاختيارات' : 'Show controls';
        await page.getByRole('button', { name: restoreLabel }).click();
        assert.equal(await surprise.getAttribute('aria-pressed'), 'true');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `horizontal overflow: ${overflow}px`);
      });

      await test(`${label} discover and search without crashes`, async () => {
        const discover = await page.goto(`${base}/${locale}/discover`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(discover?.status(), 200);
        const search = await page.goto(`${base}/${locale}/search`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(search?.status(), 200);
        const input = page.locator('main input[name="q"]');
        await input.fill('zzzzunlikelyreleasequery123');
        await input.press('Enter');
        await page.waitForURL(new RegExp(`/\\${locale}/search\\?q=`), {
          timeout: 15_000,
        });
        // Next.js may stream the route after the URL changes; wait for the
        // actual no-results state rather than racing the navigation shell.
        await page
          .getByText('zzzzunlikelyreleasequery123', { exact: true })
          .waitFor({ timeout: 15_000 });
        assert.equal(pageErrors.length, 0, pageErrors.join('; '));
      });

      await test(`${label} anonymous library stays protected`, async () => {
        await page.goto(`${base}/${locale}/library`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL(new RegExp(`/${locale}/login\\?next=`), {
          timeout: 15_000,
        });
        assert.ok(page.url().includes('/login?next='));
        assert.equal(pageErrors.length, 0, pageErrors.join('; '));
      });

      if (locale === 'en' && viewport.width === 1366) {
        await test('demo listener login and library navigation', async () => {
          await page.locator('#login-email').fill('listener@demo.local');
          await page.locator('#login-password').fill('demo1234');
          const loginResponse = page.waitForResponse(
            (response) => response.url().endsWith('/api/auth/login') &&
              response.request().method() === 'POST',
            { timeout: 15_000 },
          );
          await page.locator('form button[type="submit"]').first().click();
          const loginResult = await loginResponse;
          assert.equal(loginResult.status(), 200, 'Demo credentials must authorize');
          const storedSession = (await context.cookies()).find(
            (cookie) => cookie.name === 'aim_session',
          );
          assert.ok(storedSession, 'Session cookie was rejected by the test browser');
          await page.waitForURL((url) => url.pathname === '/en/library', {
            timeout: 20_000,
            waitUntil: 'domcontentloaded',
          });
          await page.getByRole('heading', { level: 1 }).waitFor();
          assert.equal(pageErrors.length, 0, pageErrors.join('; '));
        });
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}
process.stdout.write(
  `Browser smoke: ${tests.length - failures}/${tests.length} passed\n`,
);
if (failures) process.exitCode = 1;
