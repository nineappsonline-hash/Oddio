import { playbackEventInput } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { mutateDb } from '@/lib/data/db';
import { demoMode } from '@/lib/env';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { recordPlaybackEvent } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`events:${clientIp(request)}`, 240, 60_000);
    const input = await parseBody(request, playbackEventInput);
    const user = await getSessionUser();
    const actor = user ? { id: user.id, roles: user.roles } : null;
    if (demoMode) {
      return jsonOk(mutateDb((db) => recordPlaybackEvent(db, actor, input)));
    }

    const before = await loadDbFromSupabase();
    const after = structuredClone(before);
    const result = recordPlaybackEvent(after, actor, input);

    // The playback_qualified SQL trigger owns the production counter.
    // Do not persist the in-memory increment as well (double count).
    const original = before.tracks.find((track) => track.id === input.trackId);
    const mutated = after.tracks.find((track) => track.id === input.trackId);
    if (original && mutated) {
      original.qualifiedPlays = mutated.qualifiedPlays;
    }
    await persistChanges(before, after);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
