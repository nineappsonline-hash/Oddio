export interface QuotaEvent {
  userId: string;
  countedDateUtc: string;
  status: 'counted' | 'failed' | 'reverted';
  idempotencyKey: string;
}

export interface QuotaResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  reason: string;
}

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Counted uploads are unique per idempotency key so a retried request can never
 * consume a second slot on the same UTC day.
 */
export function evaluateUploadQuota(
  events: QuotaEvent[],
  userId: string,
  dailyLimit: number,
  date: string = utcDateKey(),
): QuotaResult {
  const counted = new Map<string, QuotaEvent>();
  for (const event of events) {
    if (event.userId !== userId) continue;
    if (event.countedDateUtc !== date) continue;
    if (event.status !== 'counted') continue;
    counted.set(event.idempotencyKey, event);
  }
  const used = counted.size;
  const allowed = used < dailyLimit;
  return {
    allowed,
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    reason: allowed
      ? 'Within daily upload quota'
      : `Daily upload limit of ${dailyLimit} reached for ${date} (UTC)`,
  };
}

export function shouldCountUpload(
  existing: QuotaEvent | undefined,
  status: QuotaEvent['status'],
): boolean {
  if (status !== 'counted') return false;
  return !existing || existing.status !== 'counted';
}
