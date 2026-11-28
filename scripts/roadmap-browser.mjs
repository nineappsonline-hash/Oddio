#!/usr/bin/env node
// Local demo UI, with an isolated response fixture for the account-sync API.
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Demo tests only');
const credentials = { email: 'listener@demo.local', password: 'demo1234' };
const engine = process.env.BROWSER_ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
});
const year = new Date().getUTCFullYear() - 1;

try {
  for (const locale of ['en', 'ar']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const path = `/${locale}/library/rewind`;
    const intended = `${path}?year=${year}`;
    for (const badYear of ['1900', '2020&year=2021']) {
      await page.goto(`${base}${path}?year=${badYear}`);
      await page.waitForURL((url) => url.pathname === `/${locale}/login`);
      assert.equal(new URL(page.url()).searchParams.get('next'), path);
    }
    await page.goto(base + intended);
    await page.waitForURL((url) => url.pathname === `/${locale}/login`);
    assert.equal(new URL(page.url()).searchParams.get('next'), intended);
    const form = page.locator('form[data-login-hydrated="true"]');
    await form.locator('#login-email').fill(credentials.email);
    await form.locator('#login-password').fill(credentials.password);
    await form.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname + url.search === intended);
    await page
      .getByRole('heading', { level: 1, name: new RegExp(String(year)) })
      .waitFor();
    assert.equal(
      await page.locator('html').getAttribute('dir'),
      locale === 'ar' ? 'rtl' : 'ltr',
    );
    await context.close();
  }
  console.log(
    'PASS Rewind selected year survives login in both locales; invalid/duplicate years discarded',
  );

  const rule = (id, title) => ({ id, title, genreId: '', moodId: '', likedOnly: true });
  let account = {
    updatedAt: '2026-11-28T10:00:00.000Z',
    rules: [rule('old', 'Original account list')],
  };
  let accountId;
  let writes = 0;
  let offline = false;
  let releaseFirstRead;
  const firstRead = new Promise((resolve) => {
    releaseFirstRead = resolve;
  });
  async function openDevice(delay = false) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const login = await context.request.post(base + '/api/auth/login', {
      data: credentials,
      headers: { origin: base },
    });
    assert.equal(login.status(), 200);
    accountId = (await login.json()).data.userId;
    await context.route('**/api/library/smart-playlists', async (route) => {
      if (route.request().method() === 'GET') {
        if (delay) {
          await firstRead;
        }
        return route.fulfill({
          json: { data: { available: true, accountId, ...account }, error: null },
        });
      }
      const payload = route.request().postDataJSON();
      assert.equal(payload.accountId, accountId);
      if (offline && delay) return route.abort();
      if (payload.expectedUpdatedAt !== account.updatedAt) {
        return route.fulfill({
          status: 409,
          json: { data: null, error: { code: 'conflict', message: 'Conflict' } },
        });
      }
      const updatedAt = new Date(Date.parse(account.updatedAt) + 1000).toISOString();
      writes++;
      account = { updatedAt, rules: payload.rules };
      return route.fulfill({ json: { data: { saved: true, updatedAt }, error: null } });
    });
    const page = await context.newPage();
    const readStarted = page.waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        new URL(request.url()).pathname === '/api/library/smart-playlists',
    );
    await page.goto(base + '/en/library', { waitUntil: 'domcontentloaded' });
    await readStarted;
    return { page, context, area: page.locator('#smart-playlists') };
  }
  const a = await openDevice(true);
  const saveButton = (device) =>
    device.area.getByRole('button', { name: 'Save smart playlist' });
  const synced = (device) =>
    device.area.getByText('Rules synced to your account.').waitFor();
  const fill = async (device, name) => {
    await device.area.getByRole('textbox', { name: 'Playlist name' }).fill(name);
    await device.area.getByRole('checkbox', { name: 'Only songs I liked' }).check();
  };
  await a.area.getByText('Checking account sync…').waitFor();
  await fill(a, 'Device A list');
  assert.equal(await saveButton(a).isDisabled(), true);
  releaseFirstRead();
  await synced(a);
  const b = await openDevice();
  await synced(b);

  await saveButton(a).press('Enter');
  try {
    await a.area.getByText('Saved to your account.').waitFor({ timeout: 12000 });
  } catch (error) {
    throw new Error(
      `Save yielded: ${(await a.area.getByRole('status').allTextContents()).join(' | ')}; fixture writes: ${writes}`,
      { cause: error },
    );
  }
  assert.deepEqual(
    account.rules.map((r) => r.title),
    ['Original account list', 'Device A list'],
  );
  await b.page.reload();
  await synced(b);
  await b.area.getByRole('button', { name: 'Device A list' }).waitFor();
  console.log(
    'PASS Slow first sync cannot overwrite existing lists; fresh device reads the saved account list',
  );

  offline = true;
  await fill(a, 'Unsynced offline list');
  await saveButton(a).press('Enter');
  await a.area
    .getByText('Saved on this device. Sync will retry when you revisit the library.')
    .waitFor();
  await fill(b, 'Device B list');
  await saveButton(b).press('Enter');
  await b.area.getByText('Saved to your account.').waitFor();
  offline = false;
  await a.page.reload();
  await a.area.getByText('Smart playlists changed on another device.').waitFor();
  await a.area.getByRole('button', { name: 'Unsynced offline list' }).waitFor();
  assert.equal(writes, 2);
  assert.equal(account.rules.at(-1).title, 'Device B list');
  await a.area.getByRole('button', { name: 'Keep account copy' }).press('Enter');
  await synced(a);
  await a.area.getByRole('button', { name: 'Device B list' }).waitFor();
  assert.equal(
    await a.area.getByRole('button', { name: 'Unsynced offline list' }).count(),
    0,
  );
  console.log(
    'PASS Offline work stays local when another device saves; no silent overwrite',
  );
} finally {
  await browser.close();
}
