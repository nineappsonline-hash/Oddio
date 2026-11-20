import { describe, expect, it } from 'vitest';
import { createSeedDb, seedIds } from '@/lib/data/seed';
import { searchCatalog } from '@/lib/data/queries';
import { projectSearchSuggestions } from './search-suggestions';

describe('safe live search suggestions', () => {
  it('projects only public/listable tracks into a minimal payload', () => {
    const db = createSeedDb();
    const viewer = { userId: seedIds.users.listener, roles: [] };
    const results = searchCatalog(db, viewer, { q: '', sort: 'relevant', limit: 25 });
    const suggestions = projectSearchSuggestions(results);
    expect(suggestions.tracks.length).toBeLessThanOrEqual(5);
    expect(suggestions.artists.length).toBeLessThanOrEqual(3);
    expect(
      suggestions.tracks.every((track) => track.id !== seedIds.tracks.privateSketch),
    ).toBe(true);
    expect(
      suggestions.tracks.every(
        (track) => Object.keys(track).sort().join(',') === 'artistName,id,slug,title',
      ),
    ).toBe(true);
  });
  it('does not expose a private track when searched by its title', () => {
    const db = createSeedDb();
    const privateTrack = db.tracks.find(
      (track) => track.id === seedIds.tracks.privateSketch,
    );
    expect(privateTrack).toBeDefined();
    const results = searchCatalog(
      db,
      { userId: seedIds.users.listener, roles: [] },
      {
        q: privateTrack!.title,
        sort: 'relevant',
        limit: 25,
      },
    );
    expect(
      projectSearchSuggestions(results).tracks.some(
        (track) => track.id === privateTrack!.id,
      ),
    ).toBe(false);
  });
});
