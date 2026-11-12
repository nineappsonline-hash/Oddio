import { artistProfileInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { updateArtist } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Errors } from '@/lib/errors';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseBody(request, artistProfileInput);
    if (!demoMode) {
      const supabase = await getSupabaseServer();
      if (!supabase) throw Errors.unauthorized();
      const { data: artist, error } = await supabase
        .from('artists')
        .update({
          name: input.name.trim(),
          slug: input.slug,
          bio: input.bio.trim(),
          accent: input.accent,
        })
        .eq('id', id)
        .eq('owner_user_id', user.id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Artist update failed: ${error.message}`);
      if (!artist) throw Errors.notFound('Artist not found');
      return jsonOk({
        artist: {
          id: artist.id,
          ownerUserId: artist.owner_user_id,
          name: artist.name,
          slug: artist.slug,
          bio: artist.bio,
          avatarUrl: '',
          coverUrl: '',
          accent: artist.accent,
          featuredTrackId: artist.featured_track_id,
          verificationStatus: artist.verification_status,
          socialLinks: [],
          createdAt: artist.created_at,
        },
      });
    }
    const artist = mutateDb((db) =>
      updateArtist(db, user, id, {
        name: input.name,
        slug: input.slug,
        bio: input.bio,
        accent: input.accent,
        socialLinks: input.socialLinks,
      }),
    );
    return jsonOk({ artist });
  } catch (error) {
    return jsonError(error);
  }
}
