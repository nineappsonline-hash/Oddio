/**
 * Small, deterministic lease state machine for serverless audio processing.
 * Retry only after a long-running job has stopped updating. The final attempt
 * transitions to dead rather than cycling indefinitely.
 */
export interface MediaJobLease {
  state: 'queued' | 'failed' | 'running' | 'succeeded' | 'dead';
  attempts: number;
  max_attempts: number;
  updated_at: string;
}

export function expiredMediaLease(
  job: MediaJobLease,
  now: Date = new Date(),
  leaseMs = 20 * 60_000,
): 'failed' | 'dead' | null {
  if (job.state !== 'running') return null;
  if (!Number.isFinite(job.attempts) || !Number.isFinite(job.max_attempts)) {
    return null;
  }
  const updatedAt = Date.parse(job.updated_at);
  if (!Number.isFinite(updatedAt) || now.getTime() - updatedAt < leaseMs) {
    return null;
  }
  return job.attempts >= job.max_attempts ? 'dead' : 'failed';
}

export function mayClaimMediaJob(
  job: Pick<MediaJobLease, 'state' | 'attempts' | 'max_attempts'>,
): boolean {
  return (
    (job.state === 'queued' || job.state === 'failed') &&
    job.attempts >= 0 &&
    job.max_attempts > job.attempts
  );
}
