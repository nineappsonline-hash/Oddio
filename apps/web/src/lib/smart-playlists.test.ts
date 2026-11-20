import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from './data/seed';
import { listableTracks } from './data/queries';
import {
  evaluateSmartPlaylist, smartPlaylistStorageKey, validateSmartPlaylistRules,
} from './smart-playlists';

describe('private smart playlist rules', () => {
  const genres = ['g1', 'g2'];
  const moods = ['m1', 'm2'];
  it('validates allowed genres and moods, removes duplicate IDs and caps stored rules', () => {
    const input = [
      { id: 'one', title: '  Favorites  ', genreId: 'g1', moodId: 'bad', likedOnly: false },
      { id: 'one', title: 'Duplicate', genreId: 'g1', moodId: '', likedOnly: false },
      { id: 'two', title: 'invalid', genreId: 'unknown', moodId: 'unknown', likedOnly: false },
      { id: 'three', title: 'Mood', genreId: '', moodId: 'm1', likedOnly: true },
    ];
    expect(validateSmartPlaylistRules(input, genres, moods)).toEqual([
      { id: 'one', title: 'Favorites', genreId: 'g1', moodId: '', likedOnly: false },
      { id: 'three', title: 'Mood', genreId: '', moodId: 'm1', likedOnly: true },
    ]);
    expect(validateSmartPlaylistRules('malformed', genres, moods)).toEqual([]);
  });

  it('scopes settings to the signed-in listener', () => {
    expect(smartPlaylistStorageKey('listener1')).not.toBe(smartPlaylistStorageKey('listener2'));
  });

  it('filters real catalog on all rules and never includes unlistable music', () => {
    const db = createSeedDb();
    const publicTracks = listableTracks(db, { userId: null, roles: [] });
    const allowed = publicTracks.find((track) => track.audio?.processingStatus === 'ready');
    expect(allowed).toBeDefined();
    const matching = evaluateSmartPlaylist(publicTracks, {
      id: 'x', title: 'Test', genreId: allowed!.genreId, moodId: '', likedOnly: true,
    }, new Set([allowed!.id]));
    expect(matching.every((track) => track.id === allowed!.id)).toBe(true);
    expect(matching.some((track) => track.id === seedIds.tracks.privateSketch)).toBe(false);
    expect(evaluateSmartPlaylist(publicTracks, {
      id: 'x', title: 'Test', genreId: '', moodId: '', likedOnly: false,
    }, new Set(), 0)).toEqual([]);
  });
});
