#!/usr/bin/env node
/**
 * Oddio release smoke checks against a running Next.js server.
 * Uses Node's built-in fetch, no browser or privileged credentials required.
 * Designed for demo/preview URLs, not a substitute for E2E audio tests.
 */
const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const routes = [
  { path: '/en', lang: 'en', dir: 'ltr', includes: 'Oddio' },
  { path: '/ar', lang: 'ar', dir: 'rtl', includes: 'Oddio' },
  { path: '/en/soundspace', lang: 'en', dir: 'ltr', includes: 'ODDIO SOUNDSCAPE' },
  { path: '/ar/soundspace', lang: 'ar', dir: 'rtl', includes: 'ODDIO SOUNDSCAPE' },
  { path: '/en/discover', lang: 'en', dir: 'ltr' },
  { path: '/ar/discover', lang: 'ar', dir: 'rtl' },
  { path: '/en/search', lang: 'en', dir: 'ltr' },
  { path: '/ar/search', lang: 'ar', dir: 'rtl' },
  { path: '/robots.txt', contentType: 'text/plain' },
  { path: '/sitemap.xml', contentType: 'xml', includes: '/en/soundspace' },
];

let failed = 0;
for (const route of routes) {
  const url = base + route.path;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const problems = [];
    if (!response.ok) problems.push(`HTTP ${response.status}`);
    if (
      route.lang &&
      !new RegExp(`<html[^>]*\\blang=["']${route.lang}["']`, 'i').test(body)
    ) {
      problems.push(`missing <html lang=${route.lang}>`);
    }
    if (
      route.dir &&
      !new RegExp(`<html[^>]*\\bdir=["']${route.dir}["']`, 'i').test(body)
    ) {
      problems.push(`missing <html dir=${route.dir}>`);
    }
    if (route.contentType && !contentType.includes(route.contentType)) {
      problems.push(`unexpected content-type: ${contentType}`);
    }
    if (route.includes && !body.includes(route.includes)) {
      problems.push(`expected content missing: ${route.includes}`);
    }
    if (problems.length) {
      failed += 1;
      process.stderr.write(`FAIL ${route.path}: ${problems.join('; ')}\n`);
    } else {
      process.stdout.write(`PASS ${route.path}\n`);
    }
  } catch (error) {
    failed += 1;
    process.stderr.write(
      `FAIL ${route.path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}
if (failed) {
  process.stderr.write(`\nRelease smoke failed: ${failed}/${routes.length} routes.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\nAll ${routes.length} Oddio HTTP smoke checks passed.\n`);
}
