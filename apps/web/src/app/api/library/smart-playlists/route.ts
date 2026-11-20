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

const rule = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    title: z.string().trim().min(1).max(70),
    genreId: z.union([z.literal(''), z.string().uuid()]),
    moodId: z.union([z.literal(''), z.string().uuid()]),
    likedOnly: z.boolean(),
  })
  .strict()
  .refine(
    (item) => Boolean(item.genreId || item.moodId || item.likedOnly),
    'At least one filter is required',
  );
const input = z.object({ rules: z.array(rule).max(12) }).strict();

export async function GET() {
  try {
    const user = await requireUser();
    if (demoMode) return jsonOk({ available: false, rules: [] });
    const { data, error } = await serviceClient()
      .from('smart_playlist_preferences')
      .select('rules,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error('Smart playlist account storage is unavailable');
    const parsed = input.safeParse({ rules: data?.rules ?? [] });
    const response = jsonOk({
      available: true,
      hasSavedState: Boolean(data),
      rules: parsed.success ? parsed.data.rules : [],
      updatedAt: data?.updated_at ?? null,
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
    rateLimit('smart-playlists:' + user.id, 20, 60_000);
    const parsed = await parseBody(request, input);
    if (new Set(parsed.rules.map((rule) => rule.id)).size !== parsed.rules.length)
      throw new Error('Duplicate smart playlist rule identifiers');
    if (demoMode) return jsonOk({ saved: false, available: false });
    const { error } = await serviceClient().from('smart_playlist_preferences').upsert(
      {
        user_id: user.id,
        rules: parsed.rules,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error('Smart playlists could not be saved');
    const response = jsonOk({ saved: true, available: true });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
