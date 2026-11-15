import { mutateDb } from '@/lib/data/db';
import { demoMode } from '@/lib/env';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { removePlaylistTrackAtomic } from '@/lib/data/atomic-social';
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
    if (!demoMode) await removePlaylistTrackAtomic(user, id, trackId);
    const playlist = demoMode
      ? mutateDb((db) => removeTrackFromPlaylist(db, user, id, trackId))
      : (await readRuntimeDb()).playlists.find((item) => item.id === id);
    if (!playlist) throw new Error('Playlist missing after update');
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
