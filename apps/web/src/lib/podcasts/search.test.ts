import { describe, expect, it } from 'vitest';
import type { PodcastCatalog, PodcastEpisode, PodcastShow } from './catalog';
import { podcastSearchQuery, searchPodcastCatalog } from './search';

const show: PodcastShow = {
  id: 'one',
  slug: 'show-mwky0f05',
  title: 'حواديت غامضة',
  description: '',
  author: 'Jimmy',
  artistId: null,
  language: 'ar',
  categoryId: 'stories',
  coverUrl: null,
  explicit: false,
};
const sample = (id: string, title: string, description = ''): PodcastEpisode => ({
  id,
  title,
  description,
  showId: show.id,
  slug: id,
  publishedAt: '2026-11-01',
  durationSeconds: 363,
  episodeNumber: 1,
  seasonNumber: null,
  explicit: false,
});
const ship = sample('2a21189b-e1e5-47b1-a141-a6ef83a22606', 'سفينة من غير طاقم');
const soldier = sample('49cd43f4-509e-417f-84bc-81a845a21841', 'الحرب اللي انتهت مرتين');
const other = sample('other', 'Other episode', 'Creator note: archaeology');
const catalog: PodcastCatalog = {
  shows: [show],
  episodes: [ship, soldier, other],
  categories: [],
};

describe('podcast catalog search', () => {
  it('finds subjects in specific editorial copy in either language', () => {
    expect(searchPodcastCatalog(catalog, '  MARY   CELESTE ').episodes).toEqual([ship]);
    expect(searchPodcastCatalog(catalog, 'هِيْرو أُونُودَا').episodes).toEqual([soldier]);
  });

  it('respects a creator description and never searches generic generated copy', () => {
    const updated = { ...ship, description: 'Creator review of a maritime story.' };
    const data = { ...catalog, episodes: [updated, other] };
    expect(searchPodcastCatalog(data, 'Mary Celeste').episodes).toEqual([]);
    expect(searchPodcastCatalog(data, 'maritime story').episodes).toEqual([updated]);
    expect(searchPodcastCatalog(data, 'Listen to').episodes).toEqual([]);
  });

  it('keeps title and author matches and gives direct episodes priority', () => {
    const direct = { ...other, description: 'Jimmy talks archaeology.' };
    const data = { ...catalog, episodes: [ship, soldier, direct] };
    expect(searchPodcastCatalog(data, 'Jimmy')).toEqual({
      shows: [show],
      episodes: [direct, ship, soldier],
    });
    expect(searchPodcastCatalog(data, 'سفينة من غير طاقم').episodes).toEqual([ship]);
  });

  it('handles repeated params and preserves the catalog when no usable search was provided', () => {
    expect(podcastSearchQuery(['  Mary Celeste ', 'ignored'])).toBe('Mary Celeste');
    expect(podcastSearchQuery('x'.repeat(500))).toHaveLength(100);
    expect(searchPodcastCatalog(catalog, '…')).toEqual({
      shows: [show],
      episodes: catalog.episodes,
    });
  });
});
