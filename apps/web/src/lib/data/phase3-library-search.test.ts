import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from './seed';
import { getLibraryData, searchCatalog } from './queries';

const viewer = { userId: seedIds.users.listener, roles: [] };

describe('Oddio Phase 3 library/search regression', () => {
  it('sorts liked tracks by most recently saved, never leaking private tracks', () => {
    const db = createSeedDb();
    db.likes = [
      { userId: viewer.userId, trackId: seedIds.tracks.cairoDawn, createdAt: '2026-01-01T00:00:00Z' },
      { userId: viewer.userId, trackId: seedIds.tracks.neonPharaonic, createdAt: '2026-11-10T00:00:00Z' },
      { userId: viewer.userId, trackId: seedIds.tracks.privateSketch, createdAt: '2026-11-11T00:00:00Z' },
    ];
    const library = getLibraryData(db, viewer);
    expect(library.likedTracks.map((track) => track.id)).toEqual([
      seedIds.tracks.neonPharaonic,
      seedIds.tracks.cairoDawn,
    ]);
    expect(library.likedTracks.every((track) => track.access.allowed)).toBe(true);
  });

  it('supports genre-only discovery without requiring a search keyword', () => {
    const db = createSeedDb();
    const results = searchCatalog(db, viewer, {
      q: '',
      genre: 'synthwave',
      sort: 'newest',
      limit: 25,
    });
    expect(results.tracks.length).toBeGreaterThan(0);
    const genreId = db.genres.find((genre) => genre.slug === 'synthwave')?.id;
    expect(results.tracks.every((track) =>
      track.genreIds?.includes(genreId ?? '') ?? track.genreId === genreId,
    )).toBe(true);
    expect(results.tracks.every((track) => track.access.listable)).toBe(true);
  });

  it('preserves search pagination and excludes nonpublic tracks', () => {
    const db = createSeedDb();
    const first = searchCatalog(db, viewer, { q: '', sort: 'popular', limit: 2 });
    expect(first.tracks).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const second = searchCatalog(db, viewer, {
      q: '',
      sort: 'popular',
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.tracks.every((track) => !first.tracks.some((other) => other.id === track.id))).toBe(true);
    expect([...first.tracks, ...second.tracks].every((track) => track.access.listable)).toBe(true);
  });

  it('never includes private playlists from another user in public search', () => {
    const db = createSeedDb();
    const results = searchCatalog(db, viewer, { q: '', limit: 25, sort: 'relevant' });
    expect(results.playlists.every((playlist) => playlist.visibility === 'public')).toBe(true);
    expect(results.playlists.find((playlist) => playlist.id === seedIds.playlists.privateMix)).toBeUndefined();
  });
});
