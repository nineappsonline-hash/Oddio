import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { decideVerification } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(2000).default(''),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    let verification;
    if (demoMode) verification = mutateDb((db) => decideVerification(db, user, id, input.decision, input.notes));
    else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      verification = decideVerification(after, user, id, input.decision, input.notes);
      await persistChanges(before, after);
    }
    return jsonOk({ verification });
  } catch (error) {
    return jsonError(error);
  }
}
