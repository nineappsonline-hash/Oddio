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
      const { data: artist, error } = await supabase.rpc(
        'update_artist_profile_atomic',
        {
          p_artist_id: id,
          p_name: input.name,
          p_slug: input.slug,
          p_bio: input.bio,
          p_accent: input.accent,
          p_social_links: input.socialLinks,
        },
      );
      if (error) throw new Error(`Artist update failed: ${error.message}`);
      if (!artist) throw Errors.notFound('Artist not found');
      const { data: links, error: linksError } = await supabase
        .from('artist_social_links')
        .select('platform, url, sort_order')
        .eq('artist_id', id)
        .order('sort_order');
      if (linksError) {
        throw new Error(`Artist links lookup failed: ${linksError.message}`);
      }
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
          socialLinks: (links ?? []).map((link) => ({
            platform: link.platform,
            url: link.url,
            sortOrder: link.sort_order,
          })),
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
