import { playlistInput } from '@ai-music/contracts';
import { mutateRuntimeDb, readRuntimeDb } from '@/lib/data/runtime-store';
import { createPlaylist } from '@/lib/data/mutations';
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
    const playlists = (await readRuntimeDb())
      .playlists.filter((playlist) => playlist.ownerId === user.id)
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
    const playlist = await mutateRuntimeDb((db) => createPlaylist(db, user, input));
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}
