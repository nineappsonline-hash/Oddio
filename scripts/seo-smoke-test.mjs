#!/usr/bin/env node
/**
 * Production SEO smoke test. No API keys required.
 * Run: node scripts/seo-smoke-test.mjs [https://oddio.online]
 * This checks availability and metadata, not search rank or actual indexing.
 */

const origin = (process.argv[2] || 'https://oddio.online').replace(/\/$/, '');
const failures = [];
const done = [];

async function fetchPage(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(`${origin}${path}`, {
      headers: {
        'user-agent': 'OddioSEOHealthCheck/1.0 (+https://oddio.online/en/about)',
        accept: 'text/html,application/xml,text/plain',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function check(condition, message) {
  if (condition) {
    done.push(message);
    console.log(`PASS  ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL  ${message}`);
  }
}

async function run() {
  const pages = [
    '/en',
    '/ar',
    '/en/about',
    '/ar/about',
    '/en/for-artists',
    '/ar/for-artists',
    '/en/discover',
    '/ar/discover',
    '/en/genres',
    '/ar/genres',
    '/en/charts',
    '/ar/charts',
  ];

  for (const path of pages) {
    try {
      const html = await fetchPage(path);
      const canonical = `${origin}${path}`;
      check(
        /<title[^>]*>[^<]*Oddio[^<]*<\/title>/i.test(html),
        `${path} has Oddio page title`,
      );
      check(
        /<meta\s+[^>]*name="description"\s+[^>]*content="[^"]{40,}"/i.test(html),
        `${path} has informative description`,
      );
      check(
        html.includes(`href="${canonical}"`) && /rel="canonical"/i.test(html),
        `${path} has a matching canonical`,
      );
      check(/hreflang="(ar|en)"/i.test(html), `${path} includes a language alternate`);
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const sitemap = await fetchPage('/sitemap.xml');
    check(
      sitemap.includes(`${origin}/en`) && sitemap.includes(`${origin}/ar`),
      'Sitemap has both language homepages',
    );
    check(
      sitemap.includes(`${origin}/en/about`) &&
        sitemap.includes(`${origin}/en/for-artists`),
      'Sitemap has public explainers',
    );
    check(
      !/\/((en|ar)\/)?(search|studio|admin|library|login|signup)(<|\?)/i.test(sitemap),
      'Sitemap excludes account/search routes',
    );
  } catch (error) {
    failures.push(`sitemap: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const robots = await fetchPage('/robots.txt');
    check(
      robots.includes(`${origin}/sitemap.xml`),
      'robots.txt points to canonical sitemap',
    );
    check(
      /User-agent:\s*\*/i.test(robots),
      'robots.txt defines public crawler instructions',
    );
  } catch (error) {
    failures.push(`robots: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`\n${done.length} checks passed; ${failures.length} failed.`);
  if (failures.length) {
    console.error(failures.map((item) => ` - ${item}`).join('\n'));
    process.exitCode = 1;
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
