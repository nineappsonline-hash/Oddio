import { searchQuery } from '@ai-music/contracts';
import { filterMusicDb, getContentLanguagePreference } from '@/lib/content-language';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { searchCatalog } from '@/lib/data/queries';
import { projectSearchSuggestions } from '@/lib/search-suggestions';
import { demoMode } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const q = (params.get('q') ?? '').trim();
    if (q.length < 2) return jsonOk({ tracks: [], artists: [] });
    const query = searchQuery.parse({ q, sort: 'relevant', limit: 5 });
    const viewer = await getViewer();
    const db = filterMusicDb(
      demoMode ? readDb() : await loadDbFromSupabase(),
      await getContentLanguagePreference(),
    );
    // SearchCatalog enforces visibility and release rules before ranking.
    const result = searchCatalog(db, viewer, query);
    return jsonOk(projectSearchSuggestions(result));
  } catch (error) {
    return jsonError(error);
  }
}
