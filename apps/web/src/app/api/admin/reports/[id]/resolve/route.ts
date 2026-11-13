import { z } from 'zod';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { resolveReport } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  resolution: z.enum(['resolve', 'dismiss']),
  notes: z.string().trim().max(2000).default(''),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['moderator', 'admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    let report;
    if (demoMode) {
      report = mutateDb((db) =>
        resolveReport(db, user, id, input.resolution, input.notes),
      );
    } else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      report = resolveReport(after, user, id, input.resolution, input.notes);
      await persistChanges(before, after);
    }
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
