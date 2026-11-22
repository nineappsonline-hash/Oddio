import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { accessForTrack } from '@/lib/data/queries';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { isPodcastId } from '@/lib/podcasts/catalog';
import { presignR2Get } from '@/lib/storage/r2-presign';
import { clientIp, rateLimit } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only authorizes playback that a visitor could already hear in Oddio.
// The range limit prevents this story editor from becoming a bulk-download API.
const CHUNK_BYTES = 2 * 1024 * 1024;

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    rateLimit(`story-audio:${clientIp(request)}`, 45, 60_000);
    const { kind, id } = await context.params;
    if (!/^[a-f0-9-]{36}$/i.test(id) || (kind !== 'track' && kind !== 'podcast')) {
      return NextResponse.json({ error: 'Invalid story media' }, { status: 400 });
    }
    if (demoMode) {
      return NextResponse.json({ error: 'Story clips unavailable in demo mode' }, { status: 404 });
    }

    let objectKey: string;
    if (kind === 'track') {
      const db = await readRuntimeDb();
      const track = db.tracks.find((item) => item.id === id);
      if (!track) return NextResponse.json({ error: 'Track unavailable' }, { status: 404 });
      const viewer = await getViewer();
      if (!accessForTrack(db, track, viewer).allowed
        || !accessForTrack(db, track, { userId: null, roles: [] }).allowed) {
        return NextResponse.json({ error: 'Only publicly playable tracks can be shared as Stories' }, { status: 403 });
      }
      if (!track.audio || track.audio.kind !== 'rendition' || track.audio.processingStatus !== 'ready') {
        return NextResponse.json({ error: 'Audio not ready' }, { status: 404 });
      }
      objectKey = track.audio.objectKey;
    } else {
      if (!isPodcastId(id)) return NextResponse.json({ error: 'Invalid episode' }, { status: 400 });
      const db = serviceClient();
      const { data: episode, error } = await db
        .from('podcast_episodes')
        .select('show_id,status,published_at,audio_object_key')
        .eq('id', id).maybeSingle();
      if (error || !episode || episode.status !== 'published' || !episode.published_at
        || Date.parse(episode.published_at) > Date.now()) {
        return NextResponse.json({ error: 'Episode unavailable' }, { status: 404 });
      }
      const { data: show } = await db.from('podcast_shows').select('status')
        .eq('id', episode.show_id).maybeSingle();
      if (show?.status !== 'published') {
        return NextResponse.json({ error: 'Episode unavailable' }, { status: 404 });
      }
      if (typeof episode.audio_object_key !== 'string'
        || !/^podcasts\/[a-f0-9-]+\.(mp3|m4a|aac)$/i.test(episode.audio_object_key)) {
        return NextResponse.json({ error: 'Audio unavailable' }, { status: 404 });
      }
      objectKey = episode.audio_object_key;
    }

    // An audio element uses byte ranges to seek to the selected excerpt.
    // Never expose a signed private R2 URL in the document or share link.
    const rawRange = request.headers.get('range');
    const match = rawRange?.match(/^bytes=(\d+)-(\d*)$/);
    if (rawRange && !match) {
      return NextResponse.json({ error: 'Unsupported range' }, { status: 416 });
    }
    const start = match ? Number(match[1]) : 0;
    if (!Number.isSafeInteger(start) || start < 0) {
      return NextResponse.json({ error: 'Invalid range' }, { status: 416 });
    }
    const requestedEnd = match?.[2] ? Number(match[2]) : start + CHUNK_BYTES - 1;
    const end = Math.min(requestedEnd, start + CHUNK_BYTES - 1);
    if (!Number.isSafeInteger(end) || end < start) {
      return NextResponse.json({ error: 'Invalid range' }, { status: 416 });
    }

    const upstream = await fetch(presignR2Get(objectKey), {
      headers: rawRange ? { Range: `bytes=${start}-${end}` } : {},
      cache: 'no-store',
      signal: request.signal,
    });
    if (!upstream.body || !upstream.ok) {
      console.error('story-audio upstream response', {
        kind,
        status: upstream.status,
        hasRange: Boolean(rawRange),
      });
      return NextResponse.json({ error: 'Audio stream unavailable' }, { status: 502 });
    }
    if (rawRange && upstream.status !== 206) {
      console.error('story-audio upstream did not honor Range', { kind, status: upstream.status });
      await upstream.body.cancel();
      return NextResponse.json({ error: 'Audio range unavailable' }, { status: 502 });
    }
    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'Accept-Ranges': 'bytes',
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'X-Content-Type-Options': 'nosniff',
    });
    for (const key of ['content-range', 'content-length']) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ error: 'Story audio unavailable' }, { status: 503 });
  }
}
