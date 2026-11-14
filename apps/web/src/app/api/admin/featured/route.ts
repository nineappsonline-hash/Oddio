import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { setFeatured } from '@/lib/data/mutations';
import type { DemoDb } from '@/lib/data/types';
import type { SessionUser } from '@/lib/auth/session';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  slot: z.enum(['hero', 'editorial', 'playlist']),
  entityType: z.enum(['track', 'artist', 'playlist']),
  entityId: z.string().min(1),
  action: z.enum(['add', 'remove', 'move_up', 'move_down']),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const input = await parseBody(request, schema);
    if (demoMode) mutateDb((db) => applyFeatured(db, user, input));
    else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      applyFeatured(after, user, input);
      await persistChanges(before, after);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function applyFeatured(db: DemoDb, actor: SessionUser, input: z.infer<typeof schema>) {
  if (input.action === 'add' || input.action === 'remove') {
    setFeatured(db, actor, { ...input, action: input.action });
    return;
  }
  const siblings = db.featuredSlots.filter((item) => item.slot === input.slot)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  const index = siblings.findIndex((item) => item.entityType === input.entityType && item.entityId === input.entityId);
  if (index < 0) throw new Error('Featured item not found');
  const target = index + (input.action === 'move_up' ? -1 : 1);
  if (target < 0 || target >= siblings.length) return;
  [siblings[index], siblings[target]] = [siblings[target]!, siblings[index]!];
  siblings.forEach((item, rank) => { item.rank = rank; });
  db.auditLog.push({ id: crypto.randomUUID(), actorId: actor.id, action: 'featured.reordered', targetType: input.entityType, targetId: input.entityId, createdAt: new Date().toISOString() } as DemoDb['auditLog'][number]);
}
