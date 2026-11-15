import { z } from 'zod';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { mutateDb } from '@/lib/data/db';
import { demoMode } from '@/lib/env';
import { addPlaylistTrackAtomic } from '@/lib/data/atomic-social';
import { addTrackToPlaylist } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({ trackId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseBody(request, schema);
    if (!demoMode) {
      await addPlaylistTrackAtomic(user, id, input.trackId);
    }
    const playlist = demoMode
      ? mutateDb((db) => addTrackToPlaylist(db, user, id, input.trackId))
      : (await readRuntimeDb()).playlists.find((item) => item.id === id);
    if (!playlist) throw new Error('Playlist missing after update');
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
