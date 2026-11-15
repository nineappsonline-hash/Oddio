import { z } from 'zod';
import {
  assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser,
} from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const payload = z.object({
  trackId: z.string().uuid(),
  reason: z.string().trim().min(30).max(2000),
});

async function ownedRejectedTrack(trackId: string, userId: string) {
  const db = serviceClient();
  const { data: track, error: trackError } = await db
    .from('tracks').select('id,artist_id,review_status')
    .eq('id', trackId).maybeSingle();
  if (trackError) throw new Error(trackError.message);
  if (!track) throw Errors.notFound('Track not found');
  const { data: artist, error: artistError } = await db
    .from('artists').select('id,owner_user_id')
    .eq('id', track.artist_id).maybeSingle();
  if (artistError) throw new Error(artistError.message);
  if (!artist || artist.owner_user_id !== userId) throw Errors.notFound('Track not found');
  if (!['rejected', 'changes_requested'].includes(track.review_status)) {
    throw Errors.invalid('Appeals are available only after a rejection or change request');
  }
  return track;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Appeals require persistent artist accounts');
    const user = await requireUser();
    if (!user.isArtistManager) throw Errors.forbidden();
    rateLimit(`review-appeal:${user.id}`, 5, 60 * 60_000);
    const input = await parseBody(request, payload);
    await ownedRejectedTrack(input.trackId, user.id);
    const db = serviceClient();
    const { data: existing, error: priorError } = await db
      .from('track_review_appeals')
      .select('id')
      .eq('track_id', input.trackId)
      .in('status', ['submitted', 'under_review'])
      .limit(1);
    if (priorError) throw new Error(priorError.message);
    if (existing?.length) throw Errors.conflict('An appeal for this track is already open');
    const { data: appeal, error } = await db
      .from('track_review_appeals')
      .insert({
        track_id: input.trackId, artist_user_id: user.id, reason: input.reason,
      }).select('id,status,created_at').single();
    if (error?.code === '23505') throw Errors.conflict('An appeal for this track is already open');
    if (error) throw new Error(error.message);
    return jsonOk({ appeal }, undefined, 201);
  } catch (error) {
    return jsonError(error);
  }
}
