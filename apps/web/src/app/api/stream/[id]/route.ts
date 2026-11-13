import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { verifyPlaybackToken } from '@/lib/auth/token';
import { getViewer } from '@/lib/auth/session';
import { objectKeyToPath, readDb } from '@/lib/data/db';
import { accessForTrack } from '@/lib/data/queries';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { presignR2Get, presignR2OriginalGet } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';

function contentTypeFor(format: string): string {
  switch (format) {
    case 'flac':
      return 'audio/flac';
    case 'wav':
      return 'audio/wav';
    case 'aiff':
      return 'audio/aiff';
    default:
      return 'audio/mpeg';
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? undefined;
  const tokenTrackId = verifyPlaybackToken(token);
  if (!tokenTrackId || tokenTrackId !== id) {
    return NextResponse.json(
      {
        error: { code: 'expired_token', message: 'Playback link is invalid or expired.' },
      },
      { status: 403 },
    );
  }

  const db = demoMode ? readDb() : await loadDbFromSupabase();
  const track = db.tracks.find((item) => item.id === id);
  if (!track || !track.audio) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Audio not found.' } },
      { status: 404 },
    );
  }
  const viewer = await getViewer();
  const access = accessForTrack(db, track, viewer);
  if (!access.allowed) {
    return NextResponse.json(
      { error: { code: 'playback_denied', message: 'Playback is not authorized.' } },
      { status: 403 },
    );
  }

  if (!demoMode) {
    const ready =
      track.audio.processingStatus === 'ready' && track.audio.kind === 'rendition';
    const originalFallback =
      track.publishStatus === 'published' &&
      track.reviewStatus === 'approved' &&
      track.audio.kind === 'original' &&
      track.audio.format === 'mp3' &&
      /^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(track.audio.objectKey);
    if (!ready && !originalFallback) {
      return NextResponse.json(
        { error: { code: 'audio_not_ready', message: 'Audio is still processing.' } },
        { status: 409 },
      );
    }
    try {
      return NextResponse.redirect(
        ready
          ? presignR2Get(track.audio.objectKey)
          : presignR2OriginalGet(track.audio.objectKey),
        307,
      );
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'storage_unavailable',
            message: 'Audio storage is unavailable.',
          },
        },
        { status: 503 },
      );
    }
  }

  const filePath = objectKeyToPath(track.audio.objectKey);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json(
      {
        error: {
          code: 'audio_missing',
          message:
            'Audio file is not available. Run npm run setup:demo to generate samples.',
        },
      },
      { status: 404 },
    );
  }

  const stat = fs.statSync(filePath);
  const range = request.headers.get('range');
  const headers: Record<string, string> = {
    'Content-Type': contentTypeFor(track.audio.format),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=0, no-store',
    'X-Content-Type-Options': 'nosniff',
  };

  if (range) {
    // RFC 9110 single byte ranges, including suffix requests from Safari and
    // other players. Reject multiple or malformed ranges rather than silently
    // serving a different slice.
    const match = /^bytes=(\\d*)-(\\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new NextResponse('Invalid range', {
        status: 416,
        headers: { 'Content-Range': `bytes */${stat.size}` },
      });
    }
    const start = match[1]
      ? Number.parseInt(match[1], 10)
      : Math.max(0, stat.size - Number.parseInt(match[2]!, 10));
    const end = match[1] && match[2]
      ? Math.min(Number.parseInt(match[2], 10), stat.size - 1)
      : stat.size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= stat.size ||
      start > end
    ) {
      return new NextResponse('Range not satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${stat.size}` },
      });
    }
    const length = end - start + 1;
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }
    return new NextResponse(new Uint8Array(buffer), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': String(length),
      },
    });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { ...headers, 'Content-Length': String(stat.size) },
  });
}
