import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from './seed';
import { getRelatedArtistsBySound } from './related-artists';
import { listableTracks } from './queries';

const guest = { userId: null, roles: [] };

describe('artist sound similarity', () => {
  it('never returns the current artist or a nonpublic-only artist', () => {
    const db = createSeedDb();
    const publicArtistIds = new Set(
      listableTracks(db, guest)
        .filter((track) => track.audio?.processingStatus === 'ready')
        .map((track) => track.artistId),
    );
    const matches = getRelatedArtistsBySound(db, seedIds.artists.nova, guest);
    expect(matches.every((artist) =>
      artist.id !== seedIds.artists.nova && publicArtistIds.has(artist.id),
    )).toBe(true);
    expect(new Set(matches.map((artist) => artist.id)).size).toBe(matches.length);
  });

  it('uses only public catalog for similarity, regardless of viewer privileges', () => {
    const db = createSeedDb();
    const a = getRelatedArtistsBySound(db, seedIds.artists.nova, guest, 4);
    const b = getRelatedArtistsBySound(db, seedIds.artists.nova, {
      userId: seedIds.users.admin, roles: ['super_admin'],
    }, 4);
    expect(a.map((artist) => artist.id)).toEqual(b.map((artist) => artist.id));
  });

  it('handles missing or unpublished artists and bounded limits', () => {
    const db = createSeedDb();
    expect(getRelatedArtistsBySound(db, 'unknown-artist', guest)).toEqual([]);
    expect(getRelatedArtistsBySound(db, seedIds.artists.nova, guest, 0)).toEqual([]);
    expect(getRelatedArtistsBySound(db, seedIds.artists.nova, guest, 100).length).toBeLessThanOrEqual(12);
  });
});
