import test from 'node:test';
import assert from 'node:assert/strict';
import { auditReleaseEnvironment } from './release-env-preflight.mjs';

const valid = {
  DEMO_MODE: 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'https://sample.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-placeholder',
  SUPABASE_SERVICE_ROLE_KEY: 'private-placeholder',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'private-placeholder',
  CRON_SECRET: 'private-placeholder',
  MEDIA_WORKER_SECRET: 'private-placeholder',
  R2_BUCKET: 'audio',
  VERCEL_PROJECT_PRODUCTION_URL: 'oddio.vercel.app',
  VERCEL_ENV: 'production',
};

test('production configuration passes without printing private values', () => {
  assert.deepEqual(auditReleaseEnvironment(valid), {
    ready: true,
    blockers: [],
    warnings: [],
  });
});

test('demo mode and missing worker or storage settings block release', () => {
  const result = auditReleaseEnvironment({
    ...valid,
    DEMO_MODE: 'true',
    CRON_SECRET: '',
    R2_SECRET_ACCESS_KEY: '',
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((message) => message.includes('DEMO_MODE')));
  assert.ok(result.blockers.some((message) => message.includes('CRON_SECRET')));
  assert.ok(result.blockers.some((message) => message.includes('R2_SECRET_ACCESS_KEY')));
});

test('local or invalid canonical addresses block production release', () => {
  const result = auditReleaseEnvironment({
    ...valid,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((message) => message.includes('Canonical')));
});

test('unsafe URL forms cannot pass the production preflight', () => {
  const unsafeSiteUrls = [
    'https://localhost:3000',
    'https://app.local',
    'https://user:password@oddio.online',
    'https://oddio.online?debug=true',
    'https://oddio.online#preview',
  ];
  for (const site of unsafeSiteUrls) {
    const result = auditReleaseEnvironment({ ...valid, NEXT_PUBLIC_SITE_URL: site });
    assert.equal(result.ready, false, `Unsafe canonical URL accepted: ${site}`);
  }
});

test('Supabase URL cannot contain credentials, fragments or query parameters', () => {
  for (const url of [
    'https://user:secret@sample.supabase.co',
    'https://sample.supabase.co?token=secret',
    'https://sample.supabase.co#fragment',
  ]) {
    const result = auditReleaseEnvironment({
      ...valid,
      NEXT_PUBLIC_SUPABASE_URL: url,
    });
    assert.equal(result.ready, false, `Unsafe Supabase URL accepted: ${url}`);
  }
});

test('a canonical HTTPS Oddio domain passes the preflight', () => {
  const result = auditReleaseEnvironment({
    ...valid,
    NEXT_PUBLIC_SITE_URL: 'https://oddio.online',
  });
  assert.equal(result.ready, true);
});
