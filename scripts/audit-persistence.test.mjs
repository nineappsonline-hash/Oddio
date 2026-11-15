import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPersistenceSource } from './audit-persistence.mjs';

const filesystemStore = `
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'oddio-demo') : path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'demo.json');
fs.writeFileSync(DB_FILE, '{}', 'utf8');
`;

test('detects ephemeral Vercel production JSON persistence', () => {
  const result = inspectPersistenceSource(filesystemStore, { demoMode: 'false' });
  assert.equal(result.ready, false);
  assert.equal(result.blockers.length, 2);
});

test('does not mislabel a demo-only store as a production issue', () => {
  const result = inspectPersistenceSource(filesystemStore, { demoMode: 'true' });
  assert.deepEqual(result, { ready: true, blockers: [] });
});

test('does not flag a database-only repository with no filesystem writes', () => {
  const source = "export const load = () => supabase.from('tracks').select('*');";
  assert.deepEqual(inspectPersistenceSource(source), { ready: true, blockers: [] });
});

test('detects JSON writes without a Vercel /tmp branch', () => {
  const source = "const DB_FILE = 'demo.json'; fs.writeFileSync(DB_FILE, '{}');";
  const result = inspectPersistenceSource(source);
  assert.equal(result.ready, false);
  assert.equal(result.blockers.length, 1);
});
