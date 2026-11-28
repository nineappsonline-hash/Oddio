#!/usr/bin/env node
/**
 * Verify the server-rendered sharing contract seen by link unfurlers.
 * Usage: SMOKE_BASE_URL=http://127.0.0.1:3100 node scripts/social-preview-smoke.mjs
 *        SMOKE_BASE_URL=https://preview.example node scripts/social-preview-smoke.mjs /ar/podcasts/shows/real-show
 *
 * Demo catalog has tracks but no published podcast shows. Pass an existing
 * public episode/show path on staging to test its real share card.
 */
import assert from 'node:assert/strict';

const base = new URL(process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3100');
const canonical = new URL(process.env.SEO_CANONICAL_ORIGIN ?? 'https://oddio.online');
const extraPaths = process.argv.slice(2);
const seedTrack = '50000000-0000-4000-8000-000000000001';
const paths = [
  '/en',
  '/ar',
  '/en/podcasts',
  '/ar/podcasts',
  `/en/tracks/${seedTrack}`,
  `/ar/tracks/${seedTrack}`,
  ...extraPaths,
];
const botHeaders = {
  accept: 'text/html',
  'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
};

function attributes(tag) {
  const result = new Map();
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(re)) {
    result.set(match[1].toLowerCase(), (match[2] ?? match[3]).replaceAll('&amp;', '&'));
  }
  return result;
}

function metaTags(html) {
  const tags = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const name = (attrs.get('property') ?? attrs.get('name'))?.toLowerCase();
    if (name) tags.set(name, attrs.get('content') ?? '');
  }
  return tags;
}

async function request(url, accept = 'text/html') {
  return fetch(url, {
    headers: { ...botHeaders, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
}

const failures = [];
let imageVerified = false;
for (const path of paths) {
  try {
    assert.ok(path.startsWith('/') && !path.startsWith('//'), 'Path must be relative');
    const response = await request(new URL(path, base));
    assert.equal(response.status, 200, `HTML HTTP status on ${path}`);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/i);
    const html = await response.text();
    const tags = metaTags(html);
    const locale = path.startsWith('/ar/') || path === '/ar' ? 'ar_EG' : 'en_US';
    const expectedCanonical = new URL(path, canonical).toString();

    assert.ok(tags.get('og:title')?.trim(), 'missing og:title');
    assert.ok(tags.get('og:description')?.trim(), 'missing og:description');
    assert.ok(tags.get('twitter:title')?.trim(), 'missing twitter:title');
    assert.equal(tags.get('twitter:card'), 'summary_large_image');
    assert.equal(tags.get('og:locale'), locale);
    assert.equal(tags.get('og:url'), expectedCanonical);
    const image = tags.get('og:image');
    assert.ok(image, 'missing og:image');
    const imageUrl = new URL(image);
    assert.equal(imageUrl.origin, canonical.origin, 'social image must be on canonical host');
    assert.equal(imageUrl.pathname, '/api/og', 'social image must use first-party OG renderer');
    assert.equal(new URL(tags.get('twitter:image') ?? '').toString(), imageUrl.toString());
    assert.equal(tags.get('og:image:width'), '1200');
    assert.equal(tags.get('og:image:height'), '630');
    assert.ok(
      html.includes(`href="${expectedCanonical}"`),
      'missing matching canonical link',
    );
    assert.doesNotMatch(
      [tags.get('og:title'), tags.get('og:description')].join(' '),
      /\b(?:undefined|null|NaN)\b/,
      'placeholder in share metadata',
    );

    if (!imageVerified) {
      // The image is canonically hosted on oddio.online in production, but
      // validate the actual generated PNG on the local preview server.
      const testImage = new URL(imageUrl.pathname + imageUrl.search, base);
      const png = await request(testImage, 'image/png');
      assert.equal(png.status, 200, 'Open Graph image is not HTTP 200');
      assert.match(png.headers.get('content-type') ?? '', /image\/png/i);
      const bytes = new Uint8Array(await png.arrayBuffer());
      assert.ok(bytes.length > 1000, 'Open Graph PNG appears empty');
      assert.deepEqual(
        Array.from(bytes.slice(0, 8)),
        [137, 80, 78, 71, 13, 10, 26, 10],
        'Invalid PNG signature',
      );
      imageVerified = true;
    }
    console.log(`PASS ${path}: bot-visible OG, X card, canonical and PNG image`);
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`FAIL ${failures.at(-1)}`);
  }
}
if (failures.length) {
  console.error(`Social card gate failed on ${failures.length} of ${paths.length} pages.`);
  process.exitCode = 1;
} else {
  console.log(`Social card gate passed on ${paths.length} routes; valid first-party PNG confirmed.`);
}
