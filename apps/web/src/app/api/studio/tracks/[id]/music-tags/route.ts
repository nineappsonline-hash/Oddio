import { z } from 'zod';
import { assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser } from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { mutateDb } from '@/lib/data/db';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';

type Proposal = {
  source: string;
  genreSlug: string;
  moodSlugs: string[];
};
const proposalFrom = (value: unknown): Proposal | null => {
  if (!value || typeof value !== 'object') return null;
  const suggestion = (value as { tagSuggestion?: Proposal }).tagSuggestion;
  if (!suggestion || suggestion.source !== 'artist-reviewed-local-model-v1'
    || typeof suggestion.genreSlug !== 'string'
    || !Array.isArray(suggestion.moodSlugs)
    || suggestion.moodSlugs.some((slug) => typeof slug !== 'string')) return null;
  return suggestion;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`track:accept-music-tags:${user.id}`, 12, 60 * 60_000);
    await parseBody(request, z.object({ action: z.literal('accept') }));
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw Errors.invalid('Invalid track');
    if (demoMode) {
      const tags = mutateDb((db) => {
        const track = db.tracks.find((item) => item.id === id);
        const artist = db.artists.find((item) => item.id === track?.artistId);
        if (!track || !artist || artist.ownerUserId !== user.id) throw Errors.notFound('Track not found');
        if (track.publishStatus !== 'unpublished'
          || !['draft', 'ready_for_review', 'changes_requested'].includes(track.reviewStatus)) {
          throw Errors.forbidden();
        }
        const proposal = proposalFrom(track.audioFeatures);
        if (!proposal) throw Errors.invalid('No reviewed music suggestions available');
        const genre = db.genres.find((item) => item.slug === proposal.genreSlug && item.active);
        const moods = proposal.moodSlugs.map((slug) => db.moods.find((item) => item.slug === slug && item.active));
        if (!genre || moods.some((mood) => !mood)) throw Errors.invalid('Suggested labels are not in catalog');
        track.genreId = genre.id;
        track.genreIds = [genre.id];
        track.moodIds = moods.map((mood) => mood!.id);
        track.audioFeatures = {
          ...(track.audioFeatures ?? {}),
          artistApprovedTags: {
            genreSlug: genre.slug, moodSlugs: proposal.moodSlugs,
            approvedAt: new Date().toISOString(),
          },
        } as typeof track.audioFeatures;
        track.updatedAt = new Date().toISOString();
        return { genreSlug: genre.slug, moodSlugs: proposal.moodSlugs };
      });
      return jsonOk({ accepted: true, tags });
    }
    const { data: artistTrack, error } = await serviceClient()
      .from('tracks')
      .select('id,artist_id,audio_features,artists!inner(owner_user_id)')
      .eq('id', id)
      .eq('artists.owner_user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!artistTrack) throw Errors.notFound('Track not found');
    const proposal = proposalFrom(artistTrack.audio_features);
    if (!proposal) throw Errors.invalid('No approved classifier suggestion available');
    // DB RPC checks ownership, editability, stored suggestion and active labels
    // again under row lock. A second request cannot silently change them.
    const { error: applyError } = await serviceClient().rpc('oddio_accept_music_tags', {
      p_user_id: user.id,
      p_track_id: id,
      p_genre_slug: proposal.genreSlug,
      p_mood_slugs: proposal.moodSlugs,
    });
    if (applyError) throw new Error(`Unable to accept music tags: ${applyError.message}`);
    return jsonOk({
      accepted: true,
      tags: { genreSlug: proposal.genreSlug, moodSlugs: proposal.moodSlugs },
    });
  } catch (error) {
    return jsonError(error);
  }
}
