import { searchQuery } from '@ai-music/contracts';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { searchCatalog } from '@/lib/data/queries';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = searchQuery.parse({
      q: url.searchParams.get('q') ?? '',
      genre: url.searchParams.get('genre') ?? undefined,
      mood: url.searchParams.get('mood') ?? undefined,
      language: url.searchParams.get('language') ?? undefined,
      country: url.searchParams.get('country') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    const viewer = await getViewer();
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const results = searchCatalog(db, viewer, query);
    return jsonOk(results);
  } catch (error) {
    return jsonError(error);
  }
}
