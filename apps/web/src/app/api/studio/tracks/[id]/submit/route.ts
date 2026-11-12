import { mutateDb } from '@/lib/data/db';
import { submitTrackForReview } from '@/lib/data/mutations';
import { assertSameOrigin, jsonError, jsonOk, requireUser } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const track = mutateDb((db) => submitTrackForReview(db, user, id));
    return jsonOk({ track });
  } catch (error) {
    return jsonError(error);
  }
}
