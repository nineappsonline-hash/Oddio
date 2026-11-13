import { describe, expect, it } from 'vitest';
import type { CatalogTrack } from './data/queries';
import { buildSoundspace } from './soundspace';

function sample(
  id: string,
  artistId: string,
  moods: string[],
  plays: number,
  date: string,
): CatalogTrack {
  return {
    id,
    artistId,
    slug: id,
    title: id,
    description: '',
    durationMs: 120000,
    qualifiedPlays: plays,
    releaseAt: date,
    genre: {
      id: 'g',
      slug: 'ambient',
      labelEn: 'Ambient',
      labelAr: 'هادئ',
      active: true,
    },
    moods: moods.map((mood) => ({
      id: mood,
      slug: mood,
      labelEn: mood,
      labelAr: mood,
      active: true,
    })),
  } as unknown as CatalogTrack;
}

const tracks = [
  sample('popular', 'artist-1', ['calm'], 2000, '2025-01-01'),
  sample('niche', 'artist-2', ['calm'], 15, '2026-01-01'),
  sample('energetic', 'artist-3', ['energetic'], 300, '2026-04-01'),
  sample('other-artist-one', 'artist-1', ['calm'], 500, '2026-03-01'),
];

describe('explainable Soundspace', () => {
  it('uses only passed-in accessible tracks and filters by mood', () => {
    const picks = buildSoundspace(tracks, 'energy', 'balanced');
    expect(picks.map(({ track }) => track.id)).toEqual(['energetic']);
    expect(picks[0]?.why).toBe('mood');
  });

  it('changes the ordering of discoveries without randomness', () => {
    const familiar = buildSoundspace(tracks, 'all', 'familiar');
    const surprising = buildSoundspace(tracks, 'all', 'surprise');
    expect(familiar[0]?.track.id).toBe('other-artist-one');
    expect(surprising[0]?.track.id).toBe('niche');
    expect(buildSoundspace(tracks, 'all', 'surprise')).toEqual(surprising);
  });

  it('promotes distinct artists before a repeat and limits results', () => {
    const picks = buildSoundspace(tracks, 'calm', 'familiar', 3);
    expect(new Set(picks.slice(0, 2).map(({ track }) => track.artistId)).size).toBe(2);
    expect(picks).toHaveLength(3);
  });

  it('returns an empty state when no music matches', () => {
    expect(buildSoundspace([], 'night', 'balanced')).toEqual([]);
  });
});
