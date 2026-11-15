#!/usr/bin/env node
/**
 * Non-destructive Oddio persistence readiness check.
 * This is a source-code guard, not an online verification of database access.
 *
 * Default mode always exits 0, emitting warnings in CI. Run with --strict as
 * a release gate once a persistent production repository adapter is installed.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function inspectPersistenceSource(source, { demoMode = 'false' } = {}) {
  const usesDemoJson = /demo\.json/.test(source);
  const usesFilesystemWrites = /fs\.writeFileSync\s*\(/.test(source);
  const usesEphemeralVercelTemp = /process\.env\.VERCEL[\s\S]{0,140}['"]\/tmp['"]/.test(source);
  const blockers = [];
  if (demoMode === 'false' && usesDemoJson && usesFilesystemWrites) {
    blockers.push(
      'Production catalog repository still writes demo.json. Connect the web data layer to Supabase before claiming durable storage.',
    );
  }
  if (demoMode === 'false' && usesEphemeralVercelTemp) {
    blockers.push(
      'Vercel runtime uses ephemeral /tmp storage. Data written there can vanish between serverless invocations.',
    );
  }
  return { ready: blockers.length === 0, blockers };
}

function run() {
  const file = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../apps/web/src/lib/data/db.ts',
  );
  const source = readFileSync(file, 'utf8');
  const result = inspectPersistenceSource(source, { demoMode: 'false' });
  if (result.ready) {
    process.stdout.write('Persistence source audit: no known JSON filesystem blocker detected. Verify the actual adapter and database integration separately.\n');
  } else {
    for (const issue of result.blockers) process.stderr.write(`PERSISTENCE BLOCKER: ${issue}\n`);
    process.stderr.write('Persistence source audit: production persistence NOT verified.\n');
  }
  if (process.argv.includes('--strict') && !result.ready) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
