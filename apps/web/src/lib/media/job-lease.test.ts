import { describe, expect, it } from 'vitest';
import { expiredMediaLease, mayClaimMediaJob } from './job-lease';

const now = new Date('2026-11-13T18:30:00.000Z');

describe('media worker stale job recovery', () => {
  it('only recovers an abandoned running job', () => {
    expect(expiredMediaLease({
      state: 'running', attempts: 1, max_attempts: 3,
      updated_at: '2026-11-13T17:00:00.000Z',
    }, now)).toBe('failed');
    expect(expiredMediaLease({
      state: 'running', attempts: 1, max_attempts: 3,
      updated_at: '2026-11-13T18:25:00.000Z',
    }, now)).toBeNull();
    expect(expiredMediaLease({
      state: 'succeeded', attempts: 1, max_attempts: 3,
      updated_at: '2026-11-12T17:00:00.000Z',
    }, now)).toBeNull();
  });

  it('terminates exhausted jobs and does not retry a dead job', () => {
    expect(expiredMediaLease({
      state: 'running', attempts: 3, max_attempts: 3,
      updated_at: '2026-11-12T17:00:00.000Z',
    }, now)).toBe('dead');
    expect(mayClaimMediaJob({ state: 'failed', attempts: 3, max_attempts: 3 })).toBe(false);
    expect(mayClaimMediaJob({ state: 'dead', attempts: 1, max_attempts: 3 })).toBe(false);
  });

  it('permits queued and retryable failed jobs, but not live work', () => {
    expect(mayClaimMediaJob({ state: 'queued', attempts: 0, max_attempts: 3 })).toBe(true);
    expect(mayClaimMediaJob({ state: 'failed', attempts: 1, max_attempts: 3 })).toBe(true);
    expect(mayClaimMediaJob({ state: 'running', attempts: 1, max_attempts: 3 })).toBe(false);
  });
});
