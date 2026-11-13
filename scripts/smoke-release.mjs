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

// Exercise real HTTP audio delivery with a generated demo MP3 fixture.
// Separate from tests of the user-facing transport and real R2 CDN.
if (process.env.SMOKE_AUDIO === 'true') {
  const trackId = '50000000-0000-4000-8000-000000000001';
  try {
    const authorized = await fetch(`${base}/api/tracks/${trackId}/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(15_000),
    });
    const result = await authorized.json();
    if (!authorized.ok || !result?.data?.streamUrl) {
      throw new Error(`Playback authorization failed: HTTP ${authorized.status}`);
    }
    const streamUrl = new URL(result.data.streamUrl, base);
    if (streamUrl.origin !== new URL(base).origin) {
      throw new Error('Playback URL unexpectedly points off-origin');
    }
    const invalid = await fetch(`${base}/api/stream/${trackId}?token=invalid`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (invalid.status !== 403) {
      throw new Error(`Invalid playback token was accepted: ${invalid.status}`);
    }
    const headBytes = await fetch(streamUrl, {
      headers: { Range: 'bytes=0-255' },
      signal: AbortSignal.timeout(10_000),
    });
    const range = headBytes.headers.get('content-range') || '';
    const body = new Uint8Array(await headBytes.arrayBuffer());
    if (headBytes.status !== 206 || body.length !== 256 || !range.startsWith('bytes 0-255/')) {
      throw new Error(`First-byte range invalid: HTTP ${headBytes.status}, ${range}`);
    }
    if (!headBytes.headers.get('content-type')?.includes('audio/mpeg')) {
      throw new Error('Missing MP3 content type');
    }
    const size = Number(range.split('/')[1]);
    const tailBytes = await fetch(streamUrl, {
      headers: { Range: 'bytes=-128' },
      signal: AbortSignal.timeout(10_000),
    });
    const tailRange = tailBytes.headers.get('content-range') || '';
    const tail = new Uint8Array(await tailBytes.arrayBuffer());
    if (tailBytes.status !== 206 || tail.length !== 128 || tailRange !== `bytes ${size - 128}-${size - 1}/${size}`) {
      throw new Error(`Suffix-byte range invalid: HTTP ${tailBytes.status}, ${tailRange}`);
    }
    const malformed = await fetch(streamUrl, {
      headers: { Range: 'bytes=0-2,5-8' },
      signal: AbortSignal.timeout(10_000),
    });
    if (malformed.status !== 416) {
      throw new Error(`Invalid multiple ranges were accepted: HTTP ${malformed.status}`);
    }
    process.stdout.write('PASS authorized MP3 stream, seeking, suffix ranges and invalid token protection\\n');
  } catch (error) {
    failed += 1;
    process.stderr.write(`FAIL audio streaming smoke: ${error instanceof Error ? error.message : String(error)}\\n`);
  }
}
if (failed) {
  process.stderr.write(`\nRelease smoke failed: ${failed}/${routes.length} routes.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\nAll ${routes.length} Oddio HTTP smoke checks passed.\n`);
}
