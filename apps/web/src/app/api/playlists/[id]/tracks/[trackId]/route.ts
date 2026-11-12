import { mutateDb } from '@/lib/data/db';
import { removeTrackFromPlaylist } from '@/lib/data/mutations';
import { assertSameOrigin, jsonError, jsonOk, requireUser } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; trackId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id, trackId } = await context.params;
    const playlist = mutateDb((db) => removeTrackFromPlaylist(db, user, id, trackId));
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
