import { describe, expect, it } from 'vitest';
import { createSeedDb } from './seed';
import { getHomeData } from './queries';

const viewer = { userId: null, roles: [] };

function fixture() {
  const db = createSeedDb(new Date('2026-11-13T10:00:00.000Z'));
  const track = db.tracks.find((item) =>
    item.publishStatus === 'published' &&
    item.reviewStatus === 'approved' &&
    item.visibility === 'public',
  );
  if (!track) throw new Error('Expected a public published seed track');
  db.featuredSlots = [{
    id: 'scheduled-placement',
    slot: 'editorial',
    entityType: 'track',
    entityId: track.id,
    rank: 0,
    startAt: '2026-11-14T10:00:00.000Z',
    endAt: '2026-11-15T10:00:00.000Z',
  }];
  return { db, track };
}

describe('editorial schedule boundaries', () => {
  it('does not show editorial placements before their start', () => {
    const { db, track } = fixture();
    expect(getHomeData(db, viewer, new Date('2026-11-14T09:59:59.999Z')).featured.some((item) => item.id === track.id)).toBe(false);
  });

  it('shows placements exactly at start and before end', () => {
    const { db, track } = fixture();
    expect(getHomeData(db, viewer, new Date('2026-11-14T10:00:00.000Z')).featured.some((item) => item.id === track.id)).toBe(true);
    expect(getHomeData(db, viewer, new Date('2026-11-15T09:59:59.999Z')).featured.some((item) => item.id === track.id)).toBe(true);
  });

  it('hides placements exactly at their end', () => {
    const { db, track } = fixture();
    expect(getHomeData(db, viewer, new Date('2026-11-15T10:00:00.000Z')).featured.some((item) => item.id === track.id)).toBe(false);
  });

  it('uses editorial rank rather than catalog order', () => {
    const { db, track } = fixture();
    const second = db.tracks.find((item) =>
      item.id !== track.id &&
      item.publishStatus === 'published' &&
      item.reviewStatus === 'approved' &&
      item.visibility === 'public',
    );
    if (!second) throw new Error('Expected second public published seed track');
    db.featuredSlots.push({
      id: 'first-placement',
      slot: 'editorial',
      entityType: 'track',
      entityId: second.id,
      rank: -1,
    });
    const result = getHomeData(db, viewer, new Date('2026-11-14T11:00:00.000Z'));
    expect(result.featured.slice(0, 2).map((item) => item.id)).toEqual([second.id, track.id]);
  });
});
