import { demoMode } from '@/lib/env';
import { mutateDb, readDb } from './db';
import { loadDbFromSupabase, persistChanges } from './supabase-store';
import type { DemoDb } from './types';

/**
 * Read from the configured runtime store. Never fall back to the ephemeral demo
 * JSON file when DEMO_MODE=false; an unavailable database is an explicit error.
 */
export async function readRuntimeDb(): Promise<DemoDb> {
  return demoMode ? readDb() : loadDbFromSupabase();
}

/**
 * Bridge existing synchronous domain mutations to durable Postgres writes.
 *
 * This preserves domain validation and the demo behaviour while API endpoints
 * migrate. Persistence is currently a multi-table diff, NOT an atomic
 * transaction or a concurrency-safe increment. High-contention counters and
 * multi-record mutations should move to dedicated SQL RPCs next.
 */
export async function mutateRuntimeDb<T>(operation: (db: DemoDb) => T): Promise<T> {
  if (demoMode) return mutateDb(operation);

  const db = await loadDbFromSupabase();
  const before = structuredClone(db);
  const result = operation(db);
  await persistChanges(before, db);
  return result;
}
