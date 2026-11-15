import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectPersistenceSource,
  inspectRoutePersistence,
} from './audit-persistence.mjs';

const adapterSource = `
export async function loadDbFromSupabase() { return {}; }
export async function persistChanges(before, after) {}
`;

test('demo JSON can coexist with the real production adapter', () => {
  const result = inspectPersistenceSource(
    "const DB_FILE = 'demo.json'; fs.writeFileSync(DB_FILE, '{}');",
    {
      adapterSource,
      routes: [
        {
          path: 'api/tracks/route.ts',
          content: 'const db = demoMode ? readDb() : await loadDbFromSupabase();',
        },
      ],
    },
  );
  assert.deepEqual(result, { ready: true, blockers: [] });
});

test('flags API routes that only use the ephemeral demo repository', () => {
  const content = "import { mutateDb } from '@/lib/data/db'; mutateDb(update);";
  assert.equal(inspectRoutePersistence(content), true);
  const result = inspectPersistenceSource('', {
    adapterSource,
    routes: [{ path: 'api/likes/route.ts', content }],
  });
  assert.equal(result.ready, false);
  assert.match(result.blockers[0], /api\/likes\/route\.ts/);
});

test('accepts runtime store adapter and explicitly switched routes', () => {
  assert.equal(
    inspectRoutePersistence('const result = await mutateRuntimeDb(toggleLike);'),
    false,
  );
  assert.equal(
    inspectRoutePersistence(
      'if (demoMode) { mutateDb(action); } else { await persistChanges(before, after); }',
    ),
    false,
  );
});

test('fails if a genuine production adapter is missing', () => {
  const result = inspectPersistenceSource('', { routes: [] });
  assert.equal(result.ready, false);
  assert.equal(result.blockers.length, 2);
});
