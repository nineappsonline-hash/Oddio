#!/usr/bin/env node
// Local demo UI, with an isolated response fixture for the account-sync API.
import assert from 'node:assert/strict';
import { createServer, request as proxyRequest } from 'node:http';
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
let proxy;

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
  let releaseNewerWrite;
  const delayedWrite = new Promise((resolve) => {
    releaseNewerWrite = resolve;
  });
  let releaseStaleRead;
  const delayedRead = new Promise((resolve) => {
    releaseStaleRead = resolve;
  });
  let markStaleReadStarted;
  const staleReadStarted = new Promise((resolve) => {
    markStaleReadStarted = resolve;
  });
  // A real local HTTP proxy avoids WebKit interception dropping intercepted
  // PUT request bodies. Only the Smart Playlist endpoint is simulated.
  proxy = createServer(async (request, response) => {
    const url = new URL(request.url, base);
    if (url.pathname !== '/api/library/smart-playlists') {
      const upstream = proxyRequest(
        url,
        { method: request.method, headers: request.headers },
        (result) => {
          response.writeHead(result.statusCode, result.headers);
          result.pipe(response);
        },
      );
      upstream.on('error', () => {
        response.writeHead(502).end();
      });
      request.pipe(upstream);
      return;
    }
    const device = request.headers['x-oddio-test-device'];
    const deviceA = device === 'a';
    const json = (status, data, error = null) =>
      response
        .writeHead(status, {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store',
        })
        .end(JSON.stringify({ data, error }));
    try {
      if (request.method === 'GET') {
        if (deviceA) await firstRead;
        if (device === 'race-read') {
          const snapshot = account;
          markStaleReadStarted();
          await delayedRead;
          return json(200, { available: true, accountId, ...snapshot });
        }
        return json(200, { available: true, accountId, ...account });
      }
      if ((offline && deviceA) || device === 'race-offline')
        return json(503, null, { code: 'offline', message: 'Offline' });
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(payload.accountId, accountId);
      if (payload.expectedUpdatedAt !== account.updatedAt)
        return json(409, null, { code: 'conflict', message: 'Conflict' });
      const updatedAt = new Date(Date.parse(account.updatedAt) + 1000).toISOString();
      writes++;
      account = { updatedAt, rules: payload.rules };
      if (device === 'race-success') await delayedWrite;
      return json(200, { saved: true, updatedAt });
    } catch (error) {
      return json(500, null, { code: 'fixture_error', message: String(error) });
    }
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });
  const syncOrigin = `http://127.0.0.1:${proxy.address().port}`;
  async function openDevice(delay = false) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: { 'x-oddio-test-device': delay ? 'a' : 'b' },
    });
    const login = await context.request.post(syncOrigin + '/api/auth/login', {
      data: credentials,
      headers: { origin: syncOrigin },
    });
    assert.equal(login.status(), 200);
    accountId = (await login.json()).data.userId;
    const page = await context.newPage();
    const readStarted = page.waitForRequest(
      (request) =>
        request.method() === 'GET' &&
        new URL(request.url()).pathname === '/api/library/smart-playlists',
    );
    await page.goto(syncOrigin + '/en/library', { waitUntil: 'domcontentloaded' });
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

  const shared = b.context;
  async function tab(tag, waitForSync = true) {
    const page = await shared.newPage();
    await page.setExtraHTTPHeaders({ 'x-oddio-test-device': tag });
    await page.goto(syncOrigin + '/en/library', { waitUntil: 'domcontentloaded' });
    const view = { page, area: page.locator('#smart-playlists') };
    if (waitForSync) await synced(view);
    return view;
  }
  const racingWrite = await tab('race-success');
  const racingOffline = await tab('race-offline');
  await fill(racingWrite, 'Successful delayed write');
  await saveButton(racingWrite).press('Enter');
  await racingWrite.area.getByText('Saving changes…').waitFor();
  await fill(racingOffline, 'Newer local edit');
  await saveButton(racingOffline).press('Enter');
  await racingOffline.area
    .getByText('Saved on this device. Sync will retry when you revisit the library.')
    .waitFor();
  const storageKey = 'oddio-smart-playlists-v1:' + accountId;
  const pending = () =>
    racingOffline.page.evaluate(
      (key) => localStorage.getItem(key + ':pending'),
      storageKey,
    );
  assert.match(await pending(), /Newer local edit/);
  releaseNewerWrite();
  await racingWrite.area.getByText('Saved to your account.').waitFor();
  assert.match(
    await pending(),
    /Newer local edit/,
    'A completed save in tab A erased the newer pending edit in tab B',
  );
  await racingOffline.page.setExtraHTTPHeaders({ 'x-oddio-test-device': 'b' });
  await racingOffline.page.reload();
  await racingOffline.area
    .getByText('Smart playlists changed on another device.')
    .waitFor();
  await racingOffline.area.getByRole('button', { name: 'Newer local edit' }).waitFor();

  await racingOffline.area
    .getByRole('button', { name: 'Keep account copy' })
    .press('Enter');
  await synced(racingOffline);
  assert.equal(await pending(), null);

  const racingRead = await tab('race-read', false);
  await Promise.race([
    staleReadStarted,
    racingRead.page
      .getByText('Account sync unavailable; using local rules.')
      .waitFor()
      .then(() => {
        throw new Error('Delayed Smart Playlist read did not reach fixture');
      }),
  ]);
  // Write the same pending record that a successful local edit writes while
  // the GET is held. No additional page clicks are needed within its timeout.
  await racingRead.page.evaluate(
    ({ key, rules, expectedUpdatedAt }) => {
      localStorage.setItem(
        key + ':pending',
        JSON.stringify({
          rules,
          updatedAt: expectedUpdatedAt,
          attempt: 'late-get-regression',
        }),
      );
    },
    {
      key: storageKey,
      rules: [...account.rules, rule('late-get', 'Newer local edit')],
      expectedUpdatedAt: account.updatedAt,
    },
  );
  releaseStaleRead();
  await synced(racingRead);
  assert.match(
    await pending(),
    /Newer local edit/,
    'A late GET in another tab erased the newer pending edit',
  );

  // An old, still-open Library tab writes this marker when its legacy PUT
  // fails after an upgrade. Reopening must preserve it without a blind PUT.
  const beforeLegacy = writes;
  await racingOffline.page.evaluate(
    ({ key, rules }) => {
      localStorage.setItem(key, JSON.stringify(rules));
      localStorage.setItem(key + ':pending', '1');
    },
    { key: storageKey, rules: [...account.rules, rule('legacy', 'Legacy browser edit')] },
  );
  await racingOffline.page.reload();
  await racingOffline.area
    .getByText('Smart playlists changed on another device.')
    .waitFor();
  await racingOffline.area.getByRole('button', { name: 'Legacy browser edit' }).waitFor();
  assert.equal(writes, beforeLegacy);
  console.log(
    'PASS Shared-browser late reads/writes preserve a newer pending edit; legacy storage survives refresh',
  );
} finally {
  await browser.close();
  proxy?.close();
}
