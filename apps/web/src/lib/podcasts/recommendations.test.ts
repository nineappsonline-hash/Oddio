import { describe, expect, it } from 'vitest';
import type { PodcastEpisode, PodcastShow } from './catalog';
import { recommendPodcasts } from './recommendations';

const show = (id: string, categoryId: string): PodcastShow => ({
  id,
  categoryId,
  slug: id,
  title: id,
  description: '',
  author: '',
  artistId: null,
  language: 'en',
  coverUrl: null,
  explicit: false,
});
const episode = (id: string, showId: string, date: string): PodcastEpisode => ({
  id,
  showId,
  slug: id,
  title: id,
  description: '',
  publishedAt: date,
  durationSeconds: 120,
  seasonNumber: null,
  episodeNumber: null,
  explicit: false,
});
const now = Date.parse('2026-11-20T10:00:00Z');

describe('podcast recommendations', () => {
  const shows = [
    show('followed', 'science'),
    show('similar', 'science'),
    show('other', 'stories'),
    show('another', 'culture'),
  ];
  const episodes = [
    episode('already-heard', 'followed', '2026-11-18T00:00:00Z'),
    episode('new-followed', 'followed', '2026-11-19T00:00:00Z'),
    episode('new-similar', 'similar', '2026-11-15T00:00:00Z'),
    episode('unpublished-future', 'another', '2026-12-01T00:00:00Z'),
  ];

  it('prioritizes related topics but does not recommend already followed shows', () => {
    const result = recommendPodcasts({ shows, episodes, followedIds: ['followed'], now });
    expect(result.recommendations[0]?.show.id).toBe('similar');
    expect(result.recommendations.some((item) => item.show.id === 'followed')).toBe(
      false,
    );
    expect(result.recommendations[0]?.reason).toBe('similar');
    expect(result.personalized).toBe(true);
  });

  it('shows only unheard episodes from followed programs in their latest feed', () => {
    const result = recommendPodcasts({
      shows,
      episodes,
      followedIds: ['followed'],
      listenedEpisodeIds: ['already-heard'],
      now,
    });
    expect(result.freshFromFollowing.map((e) => e.id)).toEqual(['new-followed']);
  });

  it('never recommends future episodes or episodes for inaccessible shows', () => {
    const result = recommendPodcasts({
      shows: shows.slice(0, 3),
      episodes: [...episodes, episode('orphan', 'hidden-show', '2026-11-20T00:00:00Z')],
      now,
    });
    const allIds = [...result.freshFromFollowing, ...result.continueExploring].map(
      (e) => e.id,
    );
    expect(allIds).not.toContain('unpublished-future');
    expect(allIds).not.toContain('orphan');
  });

  it('provides discovery fallback without a profile and stable ranking', () => {
    const input = { shows, episodes, now };
    const first = recommendPodcasts(input);
    expect(first.personalized).toBe(false);
    expect(first.recommendations.map((r) => r.show.id)).toEqual(
      recommendPodcasts(input).recommendations.map((r) => r.show.id),
    );
  });
});
