import { reviewDecisionInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
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
    const track = mutateDb((db) =>
      reviewTrack(db, user, id, input.decision, input.reason),
    );
    return jsonOk({ track });
  } catch (error) {
    return jsonError(error);
  }
}
