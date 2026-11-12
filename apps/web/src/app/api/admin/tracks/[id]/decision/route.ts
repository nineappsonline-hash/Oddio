import { reviewDecisionInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { reviewTrack } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, reviewDecisionInput);
    let track;
    if (demoMode) {
      track = mutateDb((db) => reviewTrack(db, user, id, input.decision, input.reason));
    } else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      track = reviewTrack(after, user, id, input.decision, input.reason);
      await persistChanges(before, after);
    }
    return jsonOk({ track });
  } catch (error) {
    return jsonError(error);
  }
}
