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
      const { data: artist, error } = await supabase
        .from('artists')
        .insert({
          owner_user_id: user.id,
          name: input.name.trim(),
          slug: input.slug,
          bio: input.bio.trim(),
          accent: input.accent,
        })
        .select('*')
        .single();
      if (error) throw new Error(`Artist creation failed: ${error.message}`);
      if (input.socialLinks.length) {
        const { error: linksError } = await supabase
          .from('artist_social_links')
          .insert(
            input.socialLinks.map((link, index) => ({
              artist_id: artist.id,
              platform: link.platform,
              url: link.url,
              sort_order: index,
            })),
          );
        if (linksError) {
          // Do not pretend profile creation was fully successful.
          throw new Error(
            `Artist created but social links failed: ${linksError.message}`,
          );
        }
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
