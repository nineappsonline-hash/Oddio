import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Public, non-sensitive upload policy for pre-upload client validation. */
export async function GET() {
  return NextResponse.json({
    maxUploadBytes: env.audioMaxUploadBytes,
    multipartThresholdBytes: 8 * 1024 * 1024,
    format: 'mp3',
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
