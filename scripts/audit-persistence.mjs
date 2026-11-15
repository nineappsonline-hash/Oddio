#!/usr/bin/env node
/**
 * Static, non-destructive Oddio runtime persistence audit.
 *
 * A demo JSON implementation may coexist with a production Supabase adapter.
 * Flag API routes that appear to call the demo-only store without selecting
 * a persistent production adapter. This does not replace integration tests.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function inspectRoutePersistence(source) {
  const usesDemoStore = /\b(?:mutateDb|readDb)\s*\(/.test(source);
  const hasRuntimeSelection =
    /\bdemoMode\b/.test(source) ||
    /\b(?:mutateRuntimeDb|readRuntimeDb|loadDbFromSupabase|persistChanges)\b/.test(
      source,
    );
  return usesDemoStore && !hasRuntimeSelection;
}

export function inspectPersistenceSource(_demoStore, options = {}) {
  // Backward-compatible, conservative source audit: the mere presence of
  // demo.json is not a production blocker if routes select the real adapter.
  const adapter = options.adapterSource ?? '';
  const blockers = [];
  if (!/export\s+async\s+function\s+loadDbFromSupabase\b/.test(adapter)) {
    blockers.push('Missing Supabase snapshot loader implementation');
  }
  if (!/export\s+async\s+function\s+persistChanges\b/.test(adapter)) {
    blockers.push('Missing Supabase snapshot persistence implementation');
  }
  for (const route of options.routes ?? []) {
    if (inspectRoutePersistence(route.content)) {
      blockers.push(`API route uses an unguarded demo store: ${route.path}`);
    }
  }
  return { ready: blockers.length === 0, blockers };
}

function collectRoutes(dir, root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filepath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRoutes(filepath, root));
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      files.push({
        path: path.relative(root, filepath),
        content: readFileSync(filepath, 'utf8'),
      });
    }
  }
  return files;
}

function run() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const adapterSource = readFileSync(
    path.join(root, 'apps/web/src/lib/data/supabase-store.ts'),
    'utf8',
  );
  const routes = collectRoutes(path.join(root, 'apps/web/src/app/api'), root);
  const result = inspectPersistenceSource('', { adapterSource, routes });

  if (result.ready) {
    process.stdout.write(
      'Persistence source audit: no unguarded demo API routes detected. Validate real Supabase operations separately.\n',
    );
  } else {
    for (const issue of result.blockers) {
      process.stderr.write(`PERSISTENCE BLOCKER: ${issue}\n`);
    }
    process.stderr.write('Persistence audit: some API routes need review.\n');
  }
  if (process.argv.includes('--strict') && !result.ready) process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  run();
}
