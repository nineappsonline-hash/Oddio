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

const input = z.object({ genreIds: z.array(z.string().uuid()).max(3) }).strict();
const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  try {
    const user = await requireUser();
    if (demoMode)
      return jsonOk({ available: false, show: false, genreIds: [], genres: [] });
    const db = serviceClient();
    const [{ data: saved, error }, { data: genres, error: genreError }] =
      await Promise.all([
        db.from('favorite_genre_onboarding')
          .select('genre_ids,completed')
          .eq('user_id', user.id)
          .maybeSingle(),
        db.from('genres')
          .select('id,label_en,label_ar')
          .eq('active', true)
          .order('label_en')
          .limit(80),
      ]);
    if (error || genreError) throw new Error('Favorite genres are temporarily unavailable');
    const response = jsonOk({
      available: true,
      show: !saved,
      genreIds: saved?.genre_ids ?? [],
      genres: (genres ?? []).map((genre) => ({
        id: genre.id,
        nameEn: genre.label_en,
        nameAr: genre.label_ar,
      })),
    });
    for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit('favorite-genres:' + user.id, 20, 60_000);
    const { genreIds } = await parseBody(request, input);
    if (new Set(genreIds).size !== genreIds.length)
      throw new Error('Duplicate favorite genre identifiers');
    if (demoMode) return jsonOk({ saved: false, available: false });

    const db = serviceClient();
    if (genreIds.length) {
      const { data: active, error } = await db.from('genres')
        .select('id')
        .eq('active', true)
        .in('id', genreIds);
      if (error || active?.length !== genreIds.length)
        throw new Error('A selected genre is not available');
    }
    const { error } = await db.from('favorite_genre_onboarding').upsert(
      {
        user_id: user.id,
        genre_ids: genreIds,
        completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error('Could not save favorite genres');
    const response = jsonOk({ saved: true, genreIds });
    for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
