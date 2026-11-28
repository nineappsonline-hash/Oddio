import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { demoMode } from '@/lib/env';
import { presignR2Get, presignR2StreamingPut } from '@/lib/storage/r2-presign';
import { isPodcastWriteOriginAllowed } from '@/lib/podcasts/request-origin';

export const runtime = 'nodejs';
const MAX_COVER_BYTES = 3 * 1024 * 1024;
const types = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
type CoverType = keyof typeof types;

function detectType(bytes: Uint8Array): CoverType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'jpeg';
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  )
    return 'png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'webp';
  return null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (
    !user ||
    !(
      user.isArtistManager || user.roles.some((r) => r === 'admin' || r === 'super_admin')
    )
  )
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (demoMode)
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 });
  if (!isPodcastWriteOriginAllowed(request))
    return NextResponse.json(
      { error: 'Cross-origin uploads are not allowed' },
      { status: 403 },
    );
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size < 100 || file.size > MAX_COVER_BYTES)
    return NextResponse.json(
      { error: 'Choose an image smaller than 3MB.' },
      { status: 422 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectType(bytes);
  if (!type || file.type !== types[type])
    return NextResponse.json(
      { error: 'Use a valid JPG, PNG, or WebP image.' },
      { status: 422 },
    );
  const id = randomUUID();
  const key = `podcast-covers/${id}.${type}`;
  try {
    const upload = await fetch(presignR2StreamingPut(key), {
      method: 'PUT',
      headers: { 'Content-Type': types[type] },
      body: bytes,
    });
    if (!upload.ok)
      return NextResponse.json(
        { error: 'Could not save the cover image.' },
        { status: 502 },
      );
    const coverUrl = `${new URL(request.url).origin}/api/podcasts/cover?id=${id}&type=${type}`;
    return NextResponse.json({ coverUrl });
  } catch {
    return NextResponse.json(
      { error: 'Image storage is temporarily unavailable.' },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  const type = searchParams.get('type') ?? '';
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id) || !(type in types))
    return new Response('Not found', { status: 404 });
  const contentType = types[type as CoverType];
  try {
    const response = await fetch(presignR2Get(`podcast-covers/${id}.${type}`), {
      cache: 'no-store',
    });
    if (!response.ok || !response.body) return new Response('Not found', { status: 404 });
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Cover unavailable', { status: 503 });
  }
}
