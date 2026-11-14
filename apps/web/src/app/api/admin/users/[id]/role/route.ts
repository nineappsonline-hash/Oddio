import { z } from 'zod';
import { staffRoleValues } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { setUserRole } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  role: z.enum(staffRoleValues).nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    if (demoMode) mutateDb((db) => setUserRole(db, user, id, input.role));
    else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      setUserRole(after, user, id, input.role);
      await persistChanges(before, after);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
