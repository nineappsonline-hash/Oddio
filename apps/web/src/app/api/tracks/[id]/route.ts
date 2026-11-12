import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getTrackPage } from '@/lib/data/queries';
import { Errors } from '@/lib/errors';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const viewer = await getViewer();
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const page = getTrackPage(db, viewer, id);
    if (!page) throw Errors.notFound('Track not found');
    return jsonOk(page.track);
  } catch (error) {
    return jsonError(error);
  }
}
