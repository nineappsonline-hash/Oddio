import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { getHomeData } from '@/lib/data/queries';
import { demoMode } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const viewer = await getViewer();
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    return jsonOk(getHomeData(db, viewer));
  } catch (error) {
    return jsonError(error);
  }
}
