import { NextRequest } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { buildDiscoveryMix, type MixKind } from '@/lib/data/discovery-mixes';
import { evaluateDiscoveryQuality } from '@/lib/data/discovery-quality';
import { listableTracks } from '@/lib/data/queries';
import { demoMode } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedKinds: MixKind[] = [
  'flow',
  'daily',
  'weekly',
  'song',
  'artist',
  'genre',
  'mood',
];
function list(value: string | null, max: number): string[] {
  return (value ?? '')
    .split(',')
    .filter((item) => /^[a-zA-Z0-9_-]{1,80}$/.test(item))
    .slice(0, max);
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requested = params.get('kind');
    const kind = allowedKinds.find((item) => item === requested) ?? 'flow';
    const viewer = await getViewer();
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const excludeIds = list(params.get('exclude'), 100);
    const blockedGenreIds = list(params.get('blockedGenres'), 50);
    const result = buildDiscoveryMix(db, viewer, {
      kind,
      seedId: params.get('seed') ?? undefined,
      excludeIds,
      blockedGenreIds,
      limit: 20,
    });
    const eligible = listableTracks(db, viewer).filter(
      (track) => track.access.allowed && track.audio?.processingStatus === 'ready',
    );
    const quality = evaluateDiscoveryQuality(
      eligible,
      result.tracks,
      new Set(excludeIds),
      new Set(blockedGenreIds),
    );
    const response = jsonOk({ ...result, quality });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
