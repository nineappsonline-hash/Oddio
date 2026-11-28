import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { presignR2Get } from '@/lib/storage/r2-presign';
import { isPodcastWriteOriginAllowed } from '@/lib/podcasts/request-origin';

export const runtime = 'nodejs';
const input = z.object({
  episodeId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(2000).optional(),
});
async function admin() {
  const user = await getSessionUser();
  return user && user.roles.some((role) => role === 'admin' || role === 'super_admin')
    ? user
    : null;
}
export async function POST(request: Request) {
  const user = await admin();
  if (!user)
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  if (!isPodcastWriteOriginAllowed(request))
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid review decision' }, { status: 422 });
  const { episodeId, decision, reason } = parsed.data;
  if (decision === 'reject' && !reason)
    return NextResponse.json(
      { error: 'Please provide a rejection reason' },
      { status: 422 },
    );
  const db = serviceClient();
  const { data: episode, error: lookupError } = await db
    .from('podcast_episodes')
    .select('id,show_id,status,audio_object_key')
    .eq('id', episodeId)
    .maybeSingle();
  if (lookupError)
    return NextResponse.json({ error: 'Unable to load episode' }, { status: 503 });
  if (!episode || episode.status !== 'pending_review')
    return NextResponse.json({ error: 'Episode is not pending review' }, { status: 409 });
  if (decision === 'approve') {
    const { data: show } = await db
      .from('podcast_shows')
      .select('status')
      .eq('id', episode.show_id)
      .maybeSingle();
    if (show?.status !== 'published' || !episode.audio_object_key)
      return NextResponse.json(
        { error: 'Podcast series or audio is not ready' },
        { status: 409 },
      );
    try {
      const check = await fetch(presignR2Get(episode.audio_object_key), {
        headers: { Range: 'bytes=0-2' },
        cache: 'no-store',
      });
      if (check.status !== 206)
        return NextResponse.json(
          { error: 'Audio file cannot be verified' },
          { status: 409 },
        );
      const bytes = new Uint8Array(await check.arrayBuffer());
      const valid =
        bytes.length === 3 &&
        ((bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) ||
          (bytes[0] === 255 && (bytes[1]! & 224) === 224));
      if (!valid)
        return NextResponse.json({ error: 'Invalid MP3 file' }, { status: 409 });
    } catch {
      return NextResponse.json({ error: 'Audio storage unavailable' }, { status: 503 });
    }
  }
  const changes =
    decision === 'approve'
      ? {
          status: 'published',
          published_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: 'rejected',
          published_at: null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        };
  const { data: changed, error } = await db
    .from('podcast_episodes')
    .update(changes)
    .eq('id', episodeId)
    .eq('status', 'pending_review')
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'Review decision could not be saved' },
      { status: 503 },
    );
  if (!changed)
    return NextResponse.json(
      { error: 'Episode has already been reviewed' },
      { status: 409 },
    );
  return NextResponse.json({ ok: true, status: changes.status });
}
