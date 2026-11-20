import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { isPodcastId } from '@/lib/podcasts/catalog';
import { presignR2Get } from '@/lib/storage/r2-presign';

/** Streaming is always redirected to private Cloudflare R2. No audio is proxied by Vercel. */
export const runtime = 'nodejs';
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isPodcastId(id))
    return NextResponse.json({ error: 'Invalid episode' }, { status: 400 });
  if (demoMode)
    return NextResponse.json({ error: 'Episode unavailable' }, { status: 404 });

  try {
    const db = serviceClient();
    const { data: episode, error } = await db
      .from('podcast_episodes')
      .select('show_id,status,published_at,audio_object_key')
      .eq('id', id)
      .maybeSingle();
    if (
      error ||
      !episode ||
      episode.status !== 'published' ||
      !episode.published_at ||
      new Date(episode.published_at).getTime() > Date.now()
    ) {
      return NextResponse.json({ error: 'Episode unavailable' }, { status: 404 });
    }
    const { data: show } = await db
      .from('podcast_shows')
      .select('status')
      .eq('id', episode.show_id)
      .maybeSingle();
    if (!show || show.status !== 'published')
      return NextResponse.json({ error: 'Episode unavailable' }, { status: 404 });
    const key = episode.audio_object_key;
    if (typeof key !== 'string' || !/^podcasts\/[a-f0-9-]+\.(mp3|m4a|aac)$/i.test(key)) {
      return NextResponse.json({ error: 'Audio not available' }, { status: 404 });
    }
    const response = NextResponse.redirect(presignR2Get(key), 307);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Podcast audio service unavailable' },
      { status: 503 },
    );
  }
}
