import { describe, expect, it } from 'vitest';
import type { DemoDb } from './types';
import { getDiscoveryArtists } from './discovery-artists';
const guest = { userId: null, roles: [] as [] };

function fixture(): DemoDb {
  const tracks = Array.from({ length: 6 }, (_, index) => ({
    id: 'track-' + index,
    artistId: 'artist-' + index,
    genreId: 'pop',
    genreIds: ['pop'],
    moodIds: [],
    qualifiedPlays: index === 0 ? 5000 : index,
    releaseAt: '2026-01-01T00:00:00.000Z',
    visibility: 'public',
    reviewStatus: 'approved',
    publishStatus: 'published',
    audio: { processingStatus: 'ready', objectKey: 'audio-' + index },
  }));
  return {
    tracks,
    artists: tracks.map((track) => ({
      id: track.artistId,
      name: track.artistId,
      slug: track.artistId,
      ownerUserId: 'owner',
    })),
    featuredSlots: [],
    artistFollows: [],
    genres: [],
    moods: [],
    albums: [],
    likes: [],
    comments: [],
  } as unknown as DemoDb;
}

describe('fair artist discovery', () => {
  it('prioritizes underexposed artists without including the highest play leader', () => {
    const result = getDiscoveryArtists(
      fixture(),
      guest,
      new Date('2026-11-15T10:00:00Z'),
    );
    expect(result.rising).toHaveLength(4);
    expect(result.rising.some((artist) => artist.id === 'artist-0')).toBe(false);
    expect(result.spotlight).not.toBeNull();
  });

  it('honors an active editorial artist pin and ignores a future slot', () => {
    const db = fixture();
    db.featuredSlots = [
      {
        id: 'future',
        entityType: 'artist',
        entityId: 'artist-0',
        slot: 'spotlight',
        rank: 0,
        startAt: '2100-01-01T00:00:00Z',
      },
      {
        id: 'active',
        entityType: 'artist',
        entityId: 'artist-2',
        slot: 'spotlight',
        rank: 1,
      },
    ];
    expect(getDiscoveryArtists(db, guest).spotlight?.id).toBe('artist-2');
  });

  it('never promotes a rejected or unpublished artist-only track', () => {
    const db = fixture();
    db.tracks.find((track) => track.artistId === 'artist-3')!.reviewStatus = 'rejected';
    expect(
      getDiscoveryArtists(db, guest).rising.some((artist) => artist.id === 'artist-3'),
    ).toBe(false);
  });
});
