import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = path.join(root, 'workers/media/src/index.mjs');
const source = readFileSync(workerPath, 'utf8');

function runWithEnv(patch) {
  const env = { ...process.env, ...patch };
  delete env.SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  Object.assign(env, patch);
  return spawnSync(process.execPath, [workerPath, '--once'], {
    env,
    encoding: 'utf8',
    timeout: 7000,
  });
}

test('Media worker refuses incomplete production configuration', () => {
  const noKey = runWithEnv({
    SUPABASE_URL: 'https://example.supabase.co',
    DEMO_MODE: 'false',
  });
  assert.equal(noKey.status, 1);
  assert.match(noKey.stderr, /requires both SUPABASE_URL/);

  const noUrl = runWithEnv({
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-key',
    DEMO_MODE: 'false',
  });
  assert.equal(noUrl.status, 1);
  assert.match(noUrl.stderr, /requires both SUPABASE_URL/);

  const noBoth = runWithEnv({ DEMO_MODE: 'false' });
  assert.equal(noBoth.status, 1);
  assert.match(noBoth.stderr, /refuses demo fallback/);
});

test('Media worker signs R2 URLs using AWS-compatible ISO timestamp and key pattern', () => {
  // Static guard: catches accidental double-escaping inside JS regex literals.
  assert.ok(source.includes(String.raw`replace(/[:-]|\.\d{3}/g, '')`));
  assert.ok(source.includes(String.raw`(?:\.[a-zA-Z0-9]+)?$`));
  assert.ok(!source.includes(String.raw`replace(/[:-]|\\.\\d{3}/g, '')`));
});
