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
      let page = await context.newPage();
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

      if (viewport.width === 390) {
        await test(`${label} mobile drawer stays left and closes on Escape`, async () => {
          await page.goto(`${base}/${locale}`, { waitUntil: 'domcontentloaded' });
          const headerMenu = page.getByRole('button', {
            name: locale === 'ar' ? 'افتح القائمة' : 'Open menu',
          });
          const menuLeft = await headerMenu.evaluate(
            (element) => element.getBoundingClientRect().left,
          );
          assert.ok(menuLeft < 50, `mobile menu trigger should be left: ${menuLeft}px`);
          await headerMenu.click();
          const dialog = page.getByRole('dialog', {
            name: locale === 'ar' ? 'القائمة' : 'Menu',
          });
          await dialog.waitFor({ state: 'visible' });
          const left = await dialog.evaluate(
            (element) => element.getBoundingClientRect().left,
          );
          assert.ok(Math.abs(left) <= 2, `drawer not anchored left: ${left}px`);
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'detached' });
          assert.equal(
            await page
              .locator('#oddio-mobile-menu-trigger')
              .getAttribute('aria-expanded'),
            'false',
          );
        });
      }

      await test(`${label} full player, lyrics, queue and controls`, async () => {
        await page.goto(`${base}/${locale}`, { waitUntil: 'domcontentloaded' });
        const play = page.locator('.oddio-stage-play');
        await play.waitFor({ state: 'visible' });
        await play.click();
        const mini = page.getByRole('region', {
          name: locale === 'ar' ? /مصغر|صغير|مشغل/ : /mini player/i,
        });
        await mini.waitFor({ state: 'visible' });
        await mini
          .getByRole('button', { name: /expand|كبّر|توسيع|تكبير|فتح/i })
          .first()
          .click();
        const dialog = page.getByRole('dialog', { name: /player|مشغل/i });
        await dialog.waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
        await page.keyboard.press('Tab');
        assert.equal(
          await dialog.evaluate((element) => element.contains(document.activeElement)),
          true,
          'keyboard focus must remain inside the full-player dialog',
        );
        const overflow = await dialog.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        );
        assert.ok(overflow <= 2, `full-player horizontal overflow: ${overflow}px`);

        const tabs = dialog.getByRole('tab');
        await tabs.last().click();
        assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
        await tabs.first().click();
        assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');

        if (viewport.width === 390) {
          const lyricsButton = dialog.locator(
            'button[aria-controls="oddio-mobile-lyrics"]',
          );
          await lyricsButton.click();
          assert.equal(await lyricsButton.getAttribute('aria-expanded'), 'true');
          await dialog.locator('#oddio-mobile-lyrics').waitFor({ state: 'visible' });
          await page.keyboard.press('Escape');
          assert.equal(await lyricsButton.getAttribute('aria-expanded'), 'false');
          await dialog.waitFor({ state: 'visible' });
        }

        const shuffle = dialog.getByRole('button', {
          name: locale === 'ar' ? /عشوائي/ : /shuffle/i,
        });
        const prior = await shuffle.getAttribute('aria-pressed');
        await shuffle.click();
        assert.notEqual(await shuffle.getAttribute('aria-pressed'), prior);
        const repeat = dialog.getByRole('button', {
          name: locale === 'ar' ? /تكرار/ : /repeat/i,
        });
        assert.equal(await repeat.getAttribute('aria-pressed'), 'false');
        await repeat.click();
        assert.equal(await repeat.getAttribute('aria-pressed'), 'true');

        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');

        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        const clearance = await page.evaluate(() => {
          const footerContent = document.querySelector('footer > div:last-child');
          const miniPlayer = document.querySelector('.oddio-player-bar[role="region"]');
          if (!footerContent || !miniPlayer) return null;
          return (
            miniPlayer.getBoundingClientRect().top -
            footerContent.getBoundingClientRect().bottom
          );
        });
        assert.ok(
          clearance !== null && clearance >= 0,
          `footer overlaps the mini player: ${clearance}px`,
        );
        const documentOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(
          documentOverflow <= 2,
          `page horizontal overflow: ${documentOverflow}px`,
        );
      });

      // Isolate the audio player's pending network requests from unrelated
      // route checks. WebKit can report canceled playback/lyrics fetches when a
      // playing page navigates away; those are not discover/search failures.
      await page.close();
      pageErrors.length = 0;
      page = await context.newPage();
      page.on('pageerror', (error) => pageErrors.push(error.message));

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

      await test(`${label} bilingual search filters survive pagination and submission`, async () => {
        await page.goto(`${base}/${locale}/search?sort=newest`, {
          waitUntil: 'domcontentloaded',
        });
        const filters = page.locator('form:has(select[name="genre"])');
        await filters.waitFor({ state: 'visible' });
        assert.equal(await filters.locator('select[name="sort"]').inputValue(), 'newest');
        const genres = filters.locator('select[name="genre"] option');
        const count = await genres.count();
        assert.ok(count > 1, 'active genres should be available in search filters');
        const chosen = await genres.nth(1).getAttribute('value');
        assert.ok(chosen);
        await filters.locator('select[name="genre"]').selectOption(chosen);
        await filters.getByRole('button', {
          name: locale === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters',
        }).click();
        await page.waitForURL((url) => url.searchParams.get('genre') === chosen);
        assert.equal(await filters.locator('select[name="genre"]').inputValue(), chosen);
        assert.equal(await filters.locator('select[name="sort"]').inputValue(), 'newest');
      });

      await test(`${label} anonymous library stays protected`, async () => {
        await page.goto(`${base}/${locale}/library`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL(new RegExp(`/${locale}/login\\?next=`), {
          timeout: 15_000,
        });
        assert.ok(page.url().includes('/login?next='));
        // WebKit may abort a stale speculative Next.js RSC prefetch when the
        // protected route redirects. The authenticated redirect is asserted
        // above; ignore only this browser-level navigation cancellation.
        const unexpectedErrors = pageErrors.filter(
          (message) =>
            !(
              message.includes('_rsc=') &&
              message.includes('due to access control checks')
            ),
        );
        assert.equal(unexpectedErrors.length, 0, unexpectedErrors.join('; '));
      });

      if (locale === 'en' && viewport.width === 1366) {
        await test('demo listener login and library navigation', async () => {
          // Do not submit an SSR form until React has attached its handlers.
          // Slow WebKit hydration can otherwise swallow a user click.
          await page.locator('form[data-login-hydrated="true"]').waitFor({
            state: 'visible',
            timeout: 20_000,
          });
          await page.locator('#login-email').fill('listener@demo.local');
          await page.locator('#login-password').fill('demo1234');
          const loginResponse = page.waitForResponse(
            (response) =>
              response.url().endsWith('/api/auth/login') &&
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
          try {
            await page.waitForURL((url) => url.pathname === '/en/library', {
              timeout: 20_000,
              waitUntil: 'domcontentloaded',
            });
          } catch (error) {
            const alerts = await page.locator('[role="alert"]').allTextContents();
            throw new Error(
              `Session cookie exists but browser did not reach Library. Current URL: ${page.url()}; alerts: ${alerts.join(' | ')}; runtime errors: ${pageErrors.join(' | ')}; ${error instanceof Error ? error.message : String(error)}`,
            );
          }
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
