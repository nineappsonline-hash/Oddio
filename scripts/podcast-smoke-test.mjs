#!/usr/bin/env node
/**
 * Production podcast release smoke test.
 * Safe for CI: reads only public endpoints and intentionally probes inaccessible routes.
 *
 * Usage: node scripts/podcast-smoke-test.mjs [https://oddio.online]
 * NOTE: This does not certify real upload/playback until the Supabase migrations
 * and R2 bucket CORS policy have been applied and a real episode is published.
 */
const origin = (process.argv[2] ?? 'https://oddio.online').replace(/\/$/, '');
let passed = 0,
  failed = 0;
function check(ok, label) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (ok) passed++;
  else failed++;
}
async function request(path, init = {}) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(origin + path, {
      redirect: 'manual',
      signal: controller.signal,
      ...init,
    });
  } finally {
    clearTimeout(timer);
  }
}
for (const path of [
  '/en/podcasts',
  '/ar/podcasts',
  '/en/podcasts/categories',
  '/ar/podcasts/categories',
]) {
  try {
    const response = await request(path);
    check(response.status === 200, path + ' is publicly accessible');
    const html = await response.text();
    check(/podcast|بودكاست/i.test(html), path + ' contains podcast text');
    if (path.endsWith('/categories')) {
      check(
        /Technology|تكنولوجيا/i.test(html),
        path + ' includes the Technology category',
      );
      check(/Science|علوم/i.test(html), path + ' includes the Science category');
    }
  } catch (e) {
    check(false, path + ' request: ' + String(e));
  }
}
try {
  const res = await request('/api/podcasts/episodes/not-a-uuid/audio');
  check(res.status === 400, 'invalid episode id returns 400');
} catch (e) {
  check(false, 'invalid episode probe ' + String(e));
}
try {
  const res = await request('/api/podcasts/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'publish',
      episodeId: '00000000-0000-4000-8000-000000000000',
    }),
  });
  check(res.status === 403, 'unauthenticated podcast publisher is forbidden');
} catch (e) {
  check(false, 'unauthorized publisher probe ' + String(e));
}
try {
  const response = await request('/sitemap.xml'),
    body = await response.text();
  check(
    response.ok && body.includes('/en/podcasts') && body.includes('/ar/podcasts'),
    'sitemap indexes both podcast homepages',
  );
} catch (e) {
  check(false, 'sitemap probe ' + String(e));
}
console.log(`\n${passed} passed; ${failed} failed.\n`);
process.exitCode = failed ? 1 : 0;
