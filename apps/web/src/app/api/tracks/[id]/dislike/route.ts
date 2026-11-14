import { assertSameOrigin, jsonError, jsonOk, rateLimit, requireUser } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient, loadDbFromSupabase } from '@/lib/data/supabase-store';
import { accessForTrack } from '@/lib/data/queries';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await getSessionUser();
    if (!user) return jsonOk({ disliked: false });
    const { data, error } = await serviceClient().from('track_dislikes').select('track_id').eq('user_id', user.id).eq('track_id', id).maybeSingle();
    if (error) throw error;
    return jsonOk({ disliked: Boolean(data) });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`dislike:${user.id}`, 30, 60_000);
    const { id } = await context.params;
    const db = await loadDbFromSupabase();
    const track = db.tracks.find((item) => item.id === id);
    if (!track || !accessForTrack(db, track, { userId: user.id, roles: user.roles }).allowed) return jsonOk({ disliked: false });
    const client = serviceClient();
    const { data: existing, error: readError } = await client.from('track_dislikes').select('track_id').eq('user_id', user.id).eq('track_id', id).maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await client.from('track_dislikes').delete().eq('user_id', user.id).eq('track_id', id);
      if (error) throw error;
      return jsonOk({ disliked: false });
    }
    const { error } = await client.from('track_dislikes').upsert({ user_id: user.id, track_id: id });
    if (error) throw error;
    return jsonOk({ disliked: true });
  } catch (error) { return jsonError(error); }
}
