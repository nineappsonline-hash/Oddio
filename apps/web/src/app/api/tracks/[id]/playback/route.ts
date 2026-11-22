import { getSessionUser } from '@/lib/auth/session';
import { mutateRuntimeDb } from '@/lib/data/runtime-store';
import { authorizePlayback } from '@/lib/data/mutations';
import { loadStreamAsset, touchPlaybackSession } from '@/lib/data/supabase-store';
import { evaluateTrackAccess } from '@ai-music/db';
import { signPlaybackToken } from '@/lib/auth/token';
import { AppError } from '@/lib/errors';
import { demoMode } from '@/lib/env';
import {
  anonymousHash,
  assertSameOrigin,
  clientIp,
  jsonError,
  jsonOk,
  rateLimit,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    rateLimit(`playback:${clientIp(request)}`, 120, 60_000);
    const { id } = await context.params;
    const user = await getSessionUser();
    const actor = user ? { id: user.id, roles: user.roles } : null;
    if (!demoMode) {
      const streamAsset = await loadStreamAsset(id);
      if (!streamAsset) throw new AppError('not_found', 'Track not found', 404);
      const access = evaluateTrackAccess(
        streamAsset.track,
        { userId: actor?.id ?? null, roles: actor?.roles ?? [] },
        new Date(),
        streamAsset.track.artistOwnerId,
      );
      if (!access.allowed)
        throw new AppError('playback_denied', 'Playback is not authorized.', 403);
      if (!streamAsset.audio)
        throw new AppError('audio_unavailable', 'Audio is not available.', 404);
      const sessionId = await touchPlaybackSession(actor?.id ?? null, anonymousHash(request));
      return jsonOk({
        sessionId,
        streamUrl: `/api/stream/${id}?token=${encodeURIComponent(signPlaybackToken(id))}`,
        durationMs: streamAsset.track.durationMs,
        trackId: id,
      });
    }
    const authorization = await mutateRuntimeDb((db) =>
      authorizePlayback(db, actor, id, anonymousHash(request)),
    );
    return jsonOk(authorization);
  } catch (error) {
    return jsonError(error);
  }
}
