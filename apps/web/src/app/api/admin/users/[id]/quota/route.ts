import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { updateQuota } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ dailyLimit: z.number().int().min(1).max(100) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    if (demoMode) mutateDb((db) => updateQuota(db, user, id, input.dailyLimit));
    else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      updateQuota(after, user, id, input.dailyLimit);
      await persistChanges(before, after);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
