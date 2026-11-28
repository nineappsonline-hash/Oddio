import { z } from 'zod';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';
import { Errors } from '@/lib/errors';
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
const rules = z.array(rule).max(12);
const input = z
  .object({
    rules,
    accountId: z.string().min(1),
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .refine((value) => Number.isFinite(Date.parse(value)))
      .nullable(),
  })
  .strict();

function privateResponse(
  response: ReturnType<typeof jsonOk> | ReturnType<typeof jsonError>,
) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (demoMode) return privateResponse(jsonOk({ available: false, rules: [] }));
    const { data, error } = await serviceClient()
      .from('smart_playlist_preferences')
      .select('rules,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error('Smart playlist account storage is unavailable');
    const parsed = rules.safeParse(data?.rules ?? []);
    if (!parsed.success)
      throw Errors.server('Saved smart playlist rules could not be read');
    const response = jsonOk({
      available: true,
      accountId: user.id,
      hasSavedState: Boolean(data),
      rules: parsed.data,
      updatedAt: data?.updated_at ?? null,
    });
    return privateResponse(response);
  } catch (error) {
    return privateResponse(jsonError(error));
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit('smart-playlists:' + user.id, 20, 60_000);
    const parsed = await parseBody(request, input);
    if (parsed.accountId !== user.id) throw Errors.forbidden();
    if (new Set(parsed.rules.map((rule) => rule.id)).size !== parsed.rules.length)
      throw Errors.invalid('Duplicate smart playlist rule identifiers');
    if (demoMode) return privateResponse(jsonOk({ saved: false, available: false }));
    const table = serviceClient().from('smart_playlist_preferences');
    // Compare and write in one statement. A stale device must never overwrite
    // an account snapshot written by a different request in the meantime.
    const updatedAt = new Date(
      Math.max(
        Date.now(),
        parsed.expectedUpdatedAt ? Date.parse(parsed.expectedUpdatedAt) + 1 : 0,
      ),
    ).toISOString();
    const fields = { rules: parsed.rules, updated_at: updatedAt };
    const { data, error } =
      parsed.expectedUpdatedAt === null
        ? await table
            .insert({ ...fields, user_id: user.id })
            .select('updated_at')
            .single()
        : await table
            .update(fields)
            .eq('user_id', user.id)
            .eq('updated_at', parsed.expectedUpdatedAt)
            .select('updated_at')
            .maybeSingle();
    if (error?.code === '23505' || (!error && !data))
      throw Errors.conflict('Smart playlists changed on another device.');
    if (error || !data) throw Errors.server('Smart playlists could not be saved');
    return privateResponse(
      jsonOk({ saved: true, available: true, updatedAt: data.updated_at }),
    );
  } catch (error) {
    return privateResponse(jsonError(error));
  }
}
