export interface RetryableMediaJob {
  type: string;
  state: string;
  attempts: number;
  max_attempts: number;
}

export function canRetryMediaJob(job: RetryableMediaJob | null): boolean {
  return (
    job !== null &&
    job.type === 'media.transcode' &&
    job.state === 'failed' &&
    Number.isInteger(job.attempts) &&
    Number.isInteger(job.max_attempts) &&
    job.attempts >= 0 &&
    job.attempts < job.max_attempts
  );
}
