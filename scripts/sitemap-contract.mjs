#!/usr/bin/env node
import assert from 'node:assert/strict';

const base = process.argv[2] || 'https://oddio.online';
const canonicalOrigin = process.argv[3] || 'https://oddio.online';
const html = async (path) => {
  const response = await fetch(new URL(path, base), {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, path);
  return response.text();
};

const [xml, robots] = await Promise.all([html('/sitemap.xml'), html('/robots.txt')]);
assert.match(
  robots,
  new RegExp(`Sitemap: ${canonicalOrigin.replaceAll('.', '\\.')}\\/sitemap\\.xml`, 'i'),
);
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
assert.ok(entries.length, 'Sitemap cannot be empty');
const urls = new Set();
for (const [, block] of entries) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  assert.ok(loc, 'Every entry needs a URL');
  assert.ok(!urls.has(loc), `Duplicate sitemap URL: ${loc}`);
  urls.add(loc);
  const url = new URL(loc);
  assert.equal(url.origin, canonicalOrigin);
  assert.match(url.pathname, /^\/(?:ar|en)(?:\/|$)/);
  assert.equal(url.search + url.hash, '', `Query or fragment: ${loc}`);
  assert.doesNotMatch(
    url.pathname,
    /^\/(?:ar|en)\/(?:login|signup|search|library|admin|settings|studio|notifications)(?:\/|$)/,
  );
  assert.doesNotMatch(
    url.pathname,
    /^\/(?:ar|en)\/podcasts\/(?:manage|me|history|following|for-you|notifications)(?:\/|$)/,
  );
  for (const locale of ['ar', 'en', 'x-default']) {
    const alternate = url.pathname.replace(
      /^\/(ar|en)/,
      `/${locale === 'x-default' ? 'en' : locale}`,
    );
    const expected = `hreflang="${locale}" href="${canonicalOrigin}${alternate}"`;
    assert.ok(
      block.includes(expected),
      `Missing or inaccurate hreflang on ${loc}: ${locale}`,
    );
  }
  const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  if (lastmod)
    assert.ok(Date.parse(lastmod) <= Date.now(), `Invalid/ future lastmod on ${loc}`);
}
for (const locale of ['ar', 'en']) {
  const path = `/${locale}/artists`;
  assert.ok(urls.has(canonicalOrigin + path), `${path} absent with published catalog`);
  const directory = await html(path);
  assert.match(directory, new RegExp(`href="/${locale}/artists/[^"/?]+"`));
  assert.doesNotMatch(directory, /name="robots" content="[^"]*noindex/);
  assert.ok(directory.includes(`href="${canonicalOrigin + path}"`));
}
console.log(
  `Verified ${urls.size} public canonical sitemap URLs, language alternates, and the bilingual artist directory.`,
);
