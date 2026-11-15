import { describe, expect, it } from 'vitest';
import { canRetryMediaJob } from './retry-policy';

describe('media retry eligibility', () => {
  const failed = {
    type: 'media.transcode',
    state: 'failed',
    attempts: 1,
    max_attempts: 3,
  };
  it('allows retryable failures', () => expect(canRetryMediaJob(failed)).toBe(true));
  it('rejects missing jobs', () => expect(canRetryMediaJob(null)).toBe(false));
  it('rejects running, queued, succeeded and exhausted jobs', () => {
    for (const state of ['running', 'queued', 'succeeded', 'dead']) {
      expect(canRetryMediaJob({ ...failed, state })).toBe(false);
    }
    expect(canRetryMediaJob({ ...failed, attempts: 3 })).toBe(false);
  });
  it('rejects other job types and invalid attempt counters', () => {
    expect(canRetryMediaJob({ ...failed, type: 'email.send' })).toBe(false);
    expect(canRetryMediaJob({ ...failed, attempts: -1 })).toBe(false);
    expect(canRetryMediaJob({ ...failed, attempts: Number.NaN })).toBe(false);
  });
});
