import { describe, expect, it } from 'vitest';
import { createSeedDb } from './seed';
import { toSessionUser } from './db';
import { createReport, resolveReport, reviewTrack } from './mutations';

function setup() {
  const db = createSeedDb(new Date('2026-11-13T10:00:00.000Z'));
  db.reports = []; // Isolate duplicate-report behavior from the pre-seeded demo reports.
  const listener = toSessionUser(
    db,
    db.users.find((user) => user.handle === 'nour')!,
  );
  const moderator = toSessionUser(
    db,
    db.users.find((user) => user.roles.includes('moderator'))!,
  );
  const admin = toSessionUser(
    db,
    db.users.find((user) => user.roles.includes('super_admin'))!,
  );
  const track = db.tracks.find(
    (item) =>
      item.reviewStatus === 'approved' &&
      item.visibility === 'public' &&
      item.publishStatus === 'published',
  );
  if (!track) throw new Error('Expected published seed track');
  return { db, listener, moderator, admin, track };
}

describe('moderation safeguards', () => {
  it('does not allow reports against missing targets', () => {
    const { db, listener } = setup();
    expect(() =>
      createReport(db, listener, {
        targetType: 'track',
        targetId: 'not-a-track',
        reason: 'copyright',
        details: 'Missing',
      }),
    ).toThrow(/not found/);
  });

  it('prevents repeat open reports and allows a new report once closed', () => {
    const { db, listener, moderator, track } = setup();
    const submission = {
      targetType: 'track' as const,
      targetId: track.id,
      reason: 'copyright' as const,
      details: 'Possibly unlicensed audio',
    };
    const first = createReport(db, listener, submission);
    expect(() => createReport(db, listener, submission)).toThrow(
      /already have a pending report/,
    );
    expect(() =>
      resolveReport(
        db,
        moderator,
        first.id,
        'resolve',
        'Reviewed the reported content and evidence.',
      ),
    ).not.toThrow();
    expect(createReport(db, listener, submission).id).not.toBe(first.id);
  });

  it('requires a meaningful resolution and prevents re-closing cases', () => {
    const { db, listener, moderator, track } = setup();
    const report = createReport(db, listener, {
      targetType: 'track',
      targetId: track.id,
      reason: 'spam',
      details: '',
    });
    expect(() => resolveReport(db, moderator, report.id, 'dismiss', 'ok')).toThrow(
      /10 characters/,
    );
    resolveReport(
      db,
      moderator,
      report.id,
      'dismiss',
      'Reviewed and found no violation.',
    );
    expect(() =>
      resolveReport(db, moderator, report.id, 'resolve', 'Actually, change this later.'),
    ).toThrow(/already been closed/);
  });

  it('requires reason for rejection and request-changes decisions', () => {
    const { db, admin } = setup();
    const candidate = db.tracks.find(
      (track) =>
        track.reviewStatus === 'pending_review' ||
        track.reviewStatus === 'ready_for_review',
    );
    if (!candidate) throw new Error('Expected pending seed track');
    expect(() => reviewTrack(db, admin, candidate.id, 'reject', '')).toThrow(
      /review reason/,
    );
    expect(() =>
      reviewTrack(db, admin, candidate.id, 'request_changes', 'short'),
    ).toThrow(/review reason/);
  });
});
