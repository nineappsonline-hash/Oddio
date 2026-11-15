import { NextRequest } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { buildDiscoveryMix, type MixKind } from '@/lib/data/discovery-mixes';
import { demoMode } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedKinds: MixKind[] = ['flow', 'daily', 'weekly', 'song', 'artist'];
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
    const result = buildDiscoveryMix(db, viewer, {
      kind,
      seedId: params.get('seed') ?? undefined,
      excludeIds: list(params.get('exclude'), 100),
      blockedGenreIds: list(params.get('blockedGenres'), 50),
      limit: 20,
    });
    const response = jsonOk(result);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
