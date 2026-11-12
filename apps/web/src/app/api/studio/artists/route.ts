import { artistProfileInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { createArtist } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Errors } from '@/lib/errors';
import { assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`artist:create:${user.id}`, 10, 60 * 60_000);
    const input = await parseBody(request, artistProfileInput);
    if (!demoMode) {
      const supabase = await getSupabaseServer();
      if (!supabase) throw Errors.unauthorized();
      const { data: artist, error } = await supabase.rpc(
        'create_artist_profile_atomic',
        {
          p_name: input.name,
          p_slug: input.slug,
          p_bio: input.bio,
          p_accent: input.accent,
          p_social_links: input.socialLinks,
        },
      );
      if (error) throw new Error(`Artist creation failed: ${error.message}`);
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
          socialLinks: input.socialLinks.map((link, index) => ({
            ...link,
            sortOrder: index,
          })),
          createdAt: artist.created_at,
        },
      });
    }
    const artist = mutateDb((db) =>
      createArtist(db, user, {
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
