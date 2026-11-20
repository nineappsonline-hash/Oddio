import { z } from 'zod';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({ showId: z.string().uuid() });

export async function GET() {
  try {
    const user = await requireUser();
    rateLimit(`podcast-follows:read:${user.id}`, 50, 60_000);
    if (demoMode) return jsonOk({ showIds: [], demo: true });
    const db = serviceClient();
    const { data, error } = await db
      .from('podcast_show_follows')
      .select('show_id')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return jsonOk({ showIds: (data ?? []).map((row) => row.show_id as string), demo: false });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`podcast-follows:write:${user.id}`, 25, 60_000);
    const { showId } = await parseBody(request, bodySchema);
    if (demoMode) throw Errors.invalid('Following shows is not available in demo mode.');
    const db = serviceClient();
    const { data: show, error: showError } = await db
      .from('podcast_shows')
      .select('id')
      .eq('id', showId)
      .eq('status', 'published')
      .maybeSingle();
    if (showError) throw showError;
    if (!show) throw Errors.notFound('Podcast show not found');
    const { error } = await db.from('podcast_show_follows').upsert(
      { user_id: user.id, show_id: showId },
      { onConflict: 'user_id,show_id', ignoreDuplicates: true },
    );
    if (error) throw error;
    return jsonOk({ showId, following: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`podcast-follows:write:${user.id}`, 25, 60_000);
    const { showId } = await parseBody(request, bodySchema);
    if (demoMode) throw Errors.invalid('Following shows is not available in demo mode.');
    const { error } = await serviceClient()
      .from('podcast_show_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('show_id', showId);
    if (error) throw error;
    return jsonOk({ showId, following: false });
  } catch (error) {
    return jsonError(error);
  }
}
