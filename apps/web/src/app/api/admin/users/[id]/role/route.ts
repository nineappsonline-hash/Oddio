import { z } from 'zod';
import { staffRoleValues } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges, serviceClient } from '@/lib/data/supabase-store';
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
      const db = serviceClient();
      const { error: deleteError } = await db.from('staff_roles').delete().eq('user_id', id);
      if (deleteError) throw new Error(`Failed to update staff role: ${deleteError.message}`);
      if (input.role) {
        const { error: insertError } = await db.from('staff_roles').insert({ user_id: id, role: input.role });
        if (insertError) throw new Error(`Failed to assign staff role: ${insertError.message}`);
      }
      await persistChanges(before, { ...after, users: before.users });
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
