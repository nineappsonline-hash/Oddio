import { playlistInput } from '@ai-music/contracts';
import { mutateRuntimeDb, readRuntimeDb } from '@/lib/data/runtime-store';
import { createPlaylist } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { createPlaylistDirect } from '@/lib/data/playlist-direct';
import { serviceClient } from '@/lib/data/supabase-store';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await readRuntimeDb();
    const { data: editable, error: editableError } = demoMode
      ? { data: [] as Array<{ playlist_id: string }>, error: null }
      : await serviceClient()
          .from('playlist_collaborators')
          .select('playlist_id')
          .eq('user_id', user.id);
    if (editableError) throw new Error(editableError.message);
    const editableIds = new Set((editable ?? []).map((item) => item.playlist_id));
    const playlists = db.playlists
      .filter((playlist) =>
        playlist.ownerId === user.id ||
        (editableIds.has(playlist.id) && playlist.visibility === 'public'),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return jsonOk({ playlists });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`playlist:create:${user.id}`, 20, 60_000);
    const input = await parseBody(request, playlistInput);
    const playlist = demoMode
      ? await mutateRuntimeDb((db) => createPlaylist(db, user, input))
      : await createPlaylistDirect(user, input);
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
