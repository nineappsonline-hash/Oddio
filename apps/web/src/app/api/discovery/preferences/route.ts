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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuid = z.string().uuid();
const input = z
  .object({
    trackIds: z.array(uuid).max(100),
    genreIds: z.array(uuid).max(50),
  })
  .strict();

export async function GET() {
  try {
    const user = await requireUser();
    if (demoMode) return jsonOk({ trackIds: [], genreIds: [], available: false });
    const { data, error } = await serviceClient()
      .from('discovery_preferences')
      .select('hidden_track_ids,hidden_genre_ids')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error('Discovery preferences are not available');
    const response = jsonOk({
      trackIds: (data?.hidden_track_ids ?? []) as string[],
      genreIds: (data?.hidden_genre_ids ?? []) as string[],
      available: true,
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`discovery:preferences:${user.id}`, 40, 60_000);
    const body = await parseBody(request, input);
    const trackIds = [...new Set(body.trackIds)];
    const genreIds = [...new Set(body.genreIds)];
    if (demoMode) return jsonOk({ saved: false, available: false });
    const { error } = await serviceClient().from('discovery_preferences').upsert(
      {
        user_id: user.id,
        hidden_track_ids: trackIds,
        hidden_genre_ids: genreIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error('Discovery preferences could not be saved');
    const response = jsonOk({ saved: true, available: true });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
