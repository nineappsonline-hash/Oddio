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
async function waitForAttribute(locator, attribute, expected, timeoutMs = 5000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if ((await locator.getAttribute(attribute)) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  assert.equal(await locator.getAttribute(attribute), expected);
}
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
        await waitForAttribute(surprise, 'aria-pressed', 'true');
        const focusLabel =
          locale === 'ar' ? 'وضع الاستماع الهادئ' : 'Distraction-free mode';
        await page.getByRole('button', { name: focusLabel }).click();
        const restoreLabel = locale === 'ar' ? 'إظهار الاختيارات' : 'Show controls';
        await page.getByRole('button', { name: restoreLabel }).click();
        await waitForAttribute(surprise, 'aria-pressed', 'true');
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
          // Wait for the opening transform to settle before inspecting the
          // actual drawer geometry; visible does not imply animation finished.
          await page.waitForFunction(
            () => {
              const element = document.querySelector('[role="dialog"][aria-label]');
              if (!element) return false;
              return Math.abs(element.getBoundingClientRect().left) <= 2;
            },
            null,
            { timeout: 3000 },
          );
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
        // The mobile mini-player includes a full-size background hotspot
        // under the title and controls; click its actual visible expand
        // control, rather than the covered background hotspot.
        await mini
          .getByRole('button', { name: /expand|كبّر|توسيع|تكبير|فتح/i })
          .last()
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

        // Tabs live in the desktop side panel; mobile has its own lyrics
        // disclosure and queue controls instead of those hidden tabs.
        if (viewport.width >= 1024) {
          const tabs = dialog.getByRole('tab');
          await tabs.last().click();
          assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
          await tabs.first().click();
          assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
        }

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
        const input = page.locator('main input[type="search"][name="q"]');
        const query = 'zzzzunlikelyreleasequery123';
        const submit = page.locator('main form[role="search"] button[type="submit"]');
        // Hydration may reset a value filled before React attaches the
        // controlled input, especially in Firefox. Retry the real input
        // interaction after hydration; never force-click a disabled button.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await input.fill(query);
          try {
            await submit.waitFor({ state: 'visible', timeout: 3000 });
            await page.waitForFunction(
              () => {
                const form = document.querySelector('main form[role="search"]');
                const field = form?.querySelector('input[name="q"]');
                const button = form?.querySelector('button[type="submit"]');
                return (
                  field?.value === 'zzzzunlikelyreleasequery123' &&
                  button &&
                  !button.disabled
                );
              },
              null,
              { timeout: 3000 },
            );
            break;
          } catch (error) {
            if (attempt === 4) throw error;
          }
        }
        await submit.click();
        await page.waitForURL(
          (url) =>
            url.pathname === `/${locale}/search` &&
            url.searchParams.get('q') === 'zzzzunlikelyreleasequery123',
          { timeout: 30_000 },
        );
        // Next.js may stream the route after the URL changes; wait for the
        // actual no-results state rather than racing the navigation shell.
        await page
          .locator('main')
          .getByText('zzzzunlikelyreleasequery123', { exact: true })
          .last()
          .waitFor({ timeout: 15_000 });
        assert.equal(pageErrors.length, 0, pageErrors.join('; '));
      });

      await test(`${label} Flow and radio mixes are interactive`, async () => {
        await page.goto(`${base}/${locale}/discover`, {
          waitUntil: 'domcontentloaded',
        });
        const title = locale === 'ar' ? 'شغّل Oddio Flow' : 'Start Oddio Flow';
        const start = page.getByRole('button', { name: title, exact: true });
        await start.waitFor({ state: 'visible', timeout: 15_000 });
        // Guest Flow intentionally uses the public server-rendered list
        // and does NOT make a personalized discovery API request.
        await start.click();
        await page
          .getByRole('region', {
            name: locale === 'ar' ? /مصغر|صغير|مشغل/ : /mini player/i,
          })
          .waitFor({ state: 'visible', timeout: 15_000 });
        const weeklyTitle =
          locale === 'ar' ? 'شغّل Discover Weekly' : 'Play Discover Weekly';
        // Daily and weekly mixes are intentionally hidden for guest visitors:
        // without a signed-in taste profile these would imply personalization.
        assert.equal(
          await page.getByRole('button', { name: weeklyTitle, exact: true }).count(),
          0,
        );
        const hidden = page.getByRole('button', {
          name: locale === 'ar' ? 'مش مهتم' : 'Not interested',
        });
        await hidden.first().click();
        const clear = page.getByRole('button', {
          name: locale === 'ar' ? 'مسح الاستبعادات' : 'Clear hidden music',
        });
        await clear.waitFor({ state: 'visible' });
        await clear.click();
        assert.equal(await clear.count(), 0);
      });

      // A station can initiate streaming; isolate it before later navigation.
      await page.close();
      pageErrors.length = 0;
      page = await context.newPage();
      page.on('pageerror', (error) => pageErrors.push(error.message));

      if (locale === 'en' && viewport.width === 1366) {
        await test('Phase 5 genre/mood radio and prompt mix endpoints', async () => {
          const home = await page.request.get(`${base}/api/home`);
          assert.equal(home.status(), 200);
          const body = await home.json();
          for (const [kind, items] of [
            ['genre', body.data?.genres],
            ['mood', body.data?.moods],
          ]) {
            const category = items?.find((item) => item.count > 0 && item.active);
            if (!category) continue;
            const response = await page.request.get(
              `${base}/api/discovery/mix?kind=${kind}&seed=${encodeURIComponent(category.id)}`,
            );
            assert.equal(response.status(), 200);
            const payload = await response.json();
            assert.ok(Array.isArray(payload.data?.tracks));
            for (const track of payload.data.tracks) {
              assert.ok(
                kind === 'genre'
                  ? (track.genreIds ?? [track.genreId]).includes(category.id)
                  : track.moodIds.includes(category.id),
                `${kind} radio returned an unrelated track`,
              );
            }
          }
          const promptResponse = await page.request.post(`${base}/api/discovery/prompt`, {
            data: { prompt: 'calm pop' },
            headers: { origin: base },
          });
          assert.equal(promptResponse.status(), 200);
          const promptResult = await promptResponse.json();
          assert.ok(Array.isArray(promptResult.data?.tracks));
          await page.goto(`${base}/en/discover`, { waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: 'Create mix', exact: true }).waitFor();
          assert.equal(pageErrors.length, 0, pageErrors.join('; '));
        });
      }

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
        await filters
          .getByRole('button', {
            name: locale === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters',
          })
          .click();
        await page.waitForURL((url) => url.searchParams.get('genre') === chosen);
        assert.equal(await filters.locator('select[name="genre"]').inputValue(), chosen);
        assert.equal(await filters.locator('select[name="sort"]').inputValue(), 'newest');
      });

      await test(`${label} podcast listening history navigation and controls`, async () => {
        const response = await page.goto(`${base}/${locale}/podcasts/history`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        await page.getByRole('heading', { level: 1 }).waitFor();
        const history = page.getByRole('region', {
          name: locale === 'ar' ? 'سجل استماع البودكاست' : 'Podcast listening history',
        });
        await history.waitFor({ state: 'visible' });
        const filter = history.getByRole('button', {
          name: locale === 'ar' ? /لسه مكملتهاش/ : /In progress/,
        });
        await filter.click();
        assert.equal(await filter.getAttribute('aria-pressed'), 'true');
        const input = history.getByRole('textbox', {
          name: locale === 'ar' ? 'ابحث في سجل الاستماع' : 'Search listening history',
        });
        await input.fill('no-such-episode');
        assert.equal(await input.inputValue(), 'no-such-episode');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `history layout horizontal overflow: ${overflow}px`);
      });

      await test(`${label} podcast For You discovery and responsive layout`, async () => {
        const response = await page.goto(`${base}/${locale}/podcasts/for-you`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
        const noShows = page.getByRole('heading', {
          name:
            locale === 'ar' ? 'مفيش برامج متاحة دلوقتي' : 'No shows available right now',
        });
        if (await noShows.count()) {
          await noShows.waitFor({ state: 'visible' });
        } else {
          const recommended = page.getByRole('region', {
            name: locale === 'ar' ? 'برامج مقترحة' : 'Recommended shows',
          });
          await recommended.waitFor({ state: 'visible' });
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `discovery page horizontal overflow: ${overflow}px`);
      });

      await test(`${label} podcast notifications page and guest API privacy`, async () => {
        const response = await page.goto(`${base}/${locale}/podcasts/notifications`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
        const inbox = await page.request.get(`${base}/api/podcasts/notifications`);
        assert.equal(inbox.status(), 401, 'notification inbox must require login');
        const change = await page.request.patch(`${base}/api/podcasts/notifications`, {
          headers: { origin: base },
          data: { action: 'read_all' },
        });
        assert.equal(change.status(), 401, 'guests cannot change notification state');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `notification page horizontal overflow: ${overflow}px`);
      });

      await test(`${label} following shows page and anonymous follow privacy`, async () => {
        const response = await page.goto(`${base}/${locale}/podcasts/following`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response?.status(), 200);
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
        const get = await page.request.get(`${base}/api/podcasts/follows`);
        assert.equal(get.status(), 401, 'follows must require user session');
        const post = await page.request.post(`${base}/api/podcasts/follows`, {
          data: { showId: '00000000-0000-4000-8000-000000000001' },
          headers: { origin: base },
        });
        assert.equal(post.status(), 401, 'anonymous users cannot follow shows');
        const remove = await page.request.delete(`${base}/api/podcasts/follows`, {
          data: { showId: '00000000-0000-4000-8000-000000000001' },
          headers: { origin: base },
        });
        assert.equal(remove.status(), 401, 'anonymous users cannot unfollow shows');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        assert.ok(overflow <= 2, `following page horizontal overflow: ${overflow}px`);
      });

      await test(`${label} anonymous discovery preference sync is protected`, async () => {
        const read = await page.request.get(`${base}/api/discovery/preferences`);
        assert.equal(read.status(), 401);
        const update = await page.request.put(`${base}/api/discovery/preferences`, {
          data: { trackIds: [], genreIds: [] },
          headers: { origin: base },
        });
        assert.equal(update.status(), 401);
      });

      await test(`${label} anonymous library stays protected`, async () => {
        await page.goto(`${base}/${locale}/library`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL(new RegExp(`/${locale}/login\\?next=`), {
          timeout: 15_000,
        });
        assert.ok(page.url().includes('/login?next='));
        // Listening recaps must remain protected and never expose a user's
        // history in anonymous responses (including an explicitly chosen year).
        for (const privatePath of ['library/recap', 'library/rewind?year=2026']) {
          const url = `${base}/${locale}/${privatePath}`;
          const result = await page.request.get(url, { maxRedirects: 0 });
          assert.ok(
            [302, 303, 307, 308].includes(result.status()),
            `Expected protected recap redirect, got ${result.status()} for ${url}`,
          );
          assert.ok(
            (result.headers()['location'] ?? '').includes('/login'),
            'Private recap must redirect anonymous visitor to sign-in',
          );
        }
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
          await page.goto(`${base}/en/login?next=%2Fen%2Flibrary`, {
            waitUntil: 'domcontentloaded',
          });
          const loginForm = page.locator('form[data-login-hydrated="true"]');
          await loginForm.waitFor({
            state: 'visible',
            timeout: 20_000,
          });
          await loginForm.locator('#login-email').fill('listener@demo.local');
          await loginForm.locator('#login-password').fill('demo1234');
          const loginResponse = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === '/api/auth/login' &&
              response.request().method() === 'POST',
            { timeout: 25_000 },
          );
          // Scope submit to the login form; the global first submit button
          // can belong to the persistent header search form.
          await loginForm.locator('button[type="submit"]').click();
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

      if (locale === 'en' && viewport.width === 1366) {
        await test('signed-in Rewind shows honest empty state and protects sharing', async () => {
          // Demo seed intentionally has no qualified playback events.
          // A history row alone must not be counted as an annual qualified play.
          const response = await page.goto(`${base}/en/library/rewind?year=2026`, {
            waitUntil: 'domcontentloaded',
          });
          assert.equal(response?.status(), 200);
          await page.getByRole('heading', { level: 1, name: /2026 Music Rewind/ }).waitFor();
          assert.ok(await page.getByText('No recorded qualified listens for this year yet.').isVisible());
          assert.equal(await page.getByRole('button', { name: 'Share card' }).count(), 0);
          assert.equal(await page.getByRole('button', { name: 'Save PNG image' }).count(), 0);
          const arabic = await page.goto(`${base}/ar/library/rewind?year=2026`, {
            waitUntil: 'domcontentloaded',
          });
          assert.equal(arabic?.status(), 200);
          assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
          await page.getByRole('heading', { level: 1 }).waitFor();
          await page.setViewportSize({ width: 390, height: 844 });
          const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 2, `Arabic Rewind overflow: ${overflow}px`);
          await page.setViewportSize({ width: 1366, height: 900 });
          assert.equal(pageErrors.length, 0, pageErrors.join('; '));
        });
      }

      if (locale === 'en' && viewport.width === 1366) {
        await test('liked songs custom drag order survives a page reload', async () => {
          await page.goto(`${base}/en/library?likedSort=custom#liked`, {
            waitUntil: 'domcontentloaded',
          });
          await page.locator('[data-reorder-ready="true"]').waitFor();
          const list = page.locator('ul[aria-label="Reorderable list"]').first();
          await list.waitFor({ state: 'visible' });
          const rows = list.locator('[data-reorder-index]');
          assert.ok(
            (await rows.count()) >= 2,
            'demo listener needs at least two liked songs',
          );
          const before = await rows.evaluateAll((items) =>
            items.map((item) => item.getAttribute('data-reorder-id')),
          );
          const handles = list.getByRole('button', { name: /Drag item/ });
          const first = await handles.nth(0).boundingBox();
          const second = await handles.nth(1).boundingBox();
          assert.ok(first && second, 'drag handles must have visible bounds');
          await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
          await page.mouse.down();
          await page.mouse.move(
            second.x + second.width / 2,
            second.y + second.height / 2,
            { steps: 10 },
          );
          await page.mouse.up();
          const after = await rows.evaluateAll((items) =>
            items.map((item) => item.getAttribute('data-reorder-id')),
          );
          assert.equal(
            after[0],
            before[1],
            'dragging should put the second liked item first',
          );
          assert.equal(
            after[1],
            before[0],
            'dragging should move the first liked item second',
          );
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.locator('[data-reorder-ready="true"]').waitFor();
          await list.waitFor({ state: 'visible' });
          const restored = await rows.evaluateAll((items) =>
            items.map((item) => item.getAttribute('data-reorder-id')),
          );
          assert.equal(restored[0], after[0], 'custom sort must survive reload');
          assert.equal(restored[1], after[1], 'custom sort must survive reload');
        });
      }

      if (locale === 'en' && viewport.width === 1366) {
        await test('demo account discovery exclusions never claim cloud sync', async () => {
          const read = await page.request.get(`${base}/api/discovery/preferences`);
          assert.equal(read.status(), 200);
          const prefs = await read.json();
          assert.equal(prefs.data?.available, false);
          const write = await page.request.put(`${base}/api/discovery/preferences`, {
            data: { trackIds: [], genreIds: [] },
            headers: { origin: base },
          });
          assert.equal(write.status(), 200);
          const result = await write.json();
          assert.equal(result.data?.saved, false);
          await page.goto(`${base}/en/discover`, { waitUntil: 'domcontentloaded' });
          await page
            .getByText('Hidden music is currently saved on this device.')
            .waitFor({
              state: 'visible',
              timeout: 15_000,
            });
        });
      }

      if (locale === 'en' && viewport.width === 1366) {
        await test('signed-in listener can erase underlying listening history', async () => {
          await page.goto(`${base}/en/library`, { waitUntil: 'domcontentloaded' });
          const clear = page.getByRole('button', { name: 'Delete listening history' });
          if (await clear.count()) {
            page.once('dialog', (dialog) => void dialog.accept());
            const deleted = page.waitForResponse(
              (response) =>
                response.url().endsWith('/api/library/history') &&
                response.request().method() === 'DELETE',
            );
            await clear.click();
            assert.equal((await deleted).status(), 200);
          } else {
            // Earlier browser engines may already have erased the same
            // shared demo user's seeded history; DELETE must stay idempotent.
            const response = await page.request.delete(`${base}/api/library/history`, {
              headers: { origin: base },
            });
            assert.equal(response.status(), 200);
          }
          await page.reload({ waitUntil: 'domcontentloaded' });
          assert.equal(
            await page.getByRole('button', { name: 'Delete listening history' }).count(),
            0,
          );
        });
      }

      if (locale === 'en' && viewport.width === 1366) {
        await test('signed-in queue and song position persist after reloading', async () => {
          await page.goto(`${base}/en`, { waitUntil: 'domcontentloaded' });
          await page.locator('.oddio-stage-play').click();
          await page.waitForFunction(() =>
            Object.keys(window.localStorage).some((key) =>
              key.startsWith('oddio-player-session-v1:'),
            ),
          );
          const before = await page.evaluate(() =>
            Object.entries(window.localStorage)
              .filter(([key]) => key.startsWith('oddio-player-session-v1:'))
              .map(([, value]) => JSON.parse(value)),
          );
          assert.ok(
            before.some((saved) => saved.track?.id),
            'signed-in state must use persistent localStorage',
          );
          await page.reload({ waitUntil: 'domcontentloaded' });
          const mini = page.getByRole('region', { name: /mini player/i });
          await mini.waitFor({ state: 'visible' });
          assert.ok(
            await mini.getByRole('button', { name: /play|resume/i }).count(),
            'restored player must remain paused until listener presses Play',
          );
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
