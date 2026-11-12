import { chartQuery } from '@ai-music/contracts';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getCharts } from '@/lib/data/queries';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = chartQuery.parse({
      period: url.searchParams.get('period') ?? undefined,
      country: url.searchParams.get('country') ?? undefined,
      genre: url.searchParams.get('genre') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const viewer = await getViewer();
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    return jsonOk(getCharts(db, viewer, query));
  } catch (error) {
    return jsonError(error);
  }
}
