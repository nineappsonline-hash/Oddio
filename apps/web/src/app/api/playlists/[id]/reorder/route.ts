import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { mutateDb } from '@/lib/data/db';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';
import { isValidPlaylistReorder } from '@/lib/playlist-reorder-validation';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const schema = z.object({
  trackIds: z.array(z.string().min(1)).max(500),
  expectedTrackIds: z.array(z.string().min(1)).max(500),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { trackIds, expectedTrackIds } = await parseBody(request, schema);
    if (
      new Set(trackIds).size !== trackIds.length ||
      new Set(expectedTrackIds).size !== expectedTrackIds.length
    ) {
      throw Errors.invalid('Duplicate tracks');
    }

    if (demoMode) {
      const playlist = mutateDb((db) => {
        const existing = db.playlists.find((entry) => entry.id === id);
        if (!existing) throw Errors.notFound('Playlist not found');
        if (existing.ownerId !== user.id) throw Errors.forbidden();
        if (!isValidPlaylistReorder(existing.trackIds, expectedTrackIds, trackIds)) {
          throw Errors.conflict('Playlist changed. Reload and try again.');
        }
        existing.trackIds = [...trackIds];
        return existing;
      });
      return jsonOk({ playlist });
    }

    // Only owners can change the ordering. The submitted IDs must exactly match
    // existing playlist entries: drag/drop cannot add, remove or expose tracks.
    const db = serviceClient();
    const { data: playlist, error: lookupError } = await db
      .from('playlists')
      .select('id,owner_id')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!playlist) throw Errors.notFound('Playlist not found');
    if (playlist.owner_id !== user.id) throw Errors.forbidden();
    const { data: existingRows, error: rowError } = await db
      .from('playlist_tracks')
      .select('track_id,position')
      .eq('playlist_id', id)
      .order('position', { ascending: true });
    if (rowError) throw new Error(rowError.message);
    const existing = (existingRows ?? []).map((row) => row.track_id);
    if (!isValidPlaylistReorder(existing, expectedTrackIds, trackIds)) {
      throw Errors.conflict('Playlist changed. Reload and try again.');
    }
    if (trackIds.length) {
      const { error } = await db.from('playlist_tracks').upsert(
        trackIds.map((trackId, position) => ({
          playlist_id: id,
          track_id: trackId,
          position,
        })),
        { onConflict: 'playlist_id,track_id' },
      );
      if (error) throw new Error(`Playlist reorder failed: ${error.message}`);
      // Read back the authoritative sequence, rather than claim success
      // when a constraint or concurrent writer has changed the result.
      const { data: saved, error: verifyError } = await db
        .from('playlist_tracks')
        .select('track_id')
        .eq('playlist_id', id)
        .order('position', { ascending: true });
      if (verifyError)
        throw new Error(`Playlist reorder verification failed: ${verifyError.message}`);
      if (
        !saved ||
        saved.length !== trackIds.length ||
        saved.some((row, index) => row.track_id !== trackIds[index])
      ) {
        throw Errors.conflict(
          'Playlist order changed while saving. Reload and try again.',
        );
      }
    }
    return jsonOk({ trackIds });
  } catch (error) {
    return jsonError(error);
  }
}
