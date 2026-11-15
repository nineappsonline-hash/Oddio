import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { readRuntimeDb } from '@/lib/data/runtime-store';
import { accessForTrack } from '@/lib/data/queries';
import { demoMode } from '@/lib/env';
import { presignR2Get } from '@/lib/storage/r2-presign';

/**
 * A metadata-only source for older tracks that were published before their
 * duration_ms was populated. Browsers issue range requests through the signed
 * R2 URL, so we don't proxy/download the audio through Vercel.
 */
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid track id' }, { status: 400 });
  }

  const db = await readRuntimeDb();
  const track = db.tracks.find((item) => item.id === id);
  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }
  const viewer = await getViewer();
  if (!accessForTrack(db, track, viewer).allowed) {
    return NextResponse.json({ error: 'Track not available' }, { status: 403 });
  }

  if (demoMode || track.durationMs > 0) {
    return NextResponse.json({ error: 'Metadata source unavailable' }, { status: 404 });
  }
  const audio = track.audio;
  if (!audio || audio.kind !== 'rendition' || audio.processingStatus !== 'ready') {
    return NextResponse.json({ error: 'Audio not ready' }, { status: 404 });
  }

  try {
    const response = NextResponse.redirect(presignR2Get(audio.objectKey), 307);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch {
    return NextResponse.json({ error: 'Audio metadata unavailable' }, { status: 503 });
  }
}
