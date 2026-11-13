import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/data/supabase-store';
import { presignR2Head, presignR2StreamingPut } from '@/lib/storage/r2-presign';
import { env } from '@/lib/env';
import { expiredMediaLease, mayClaimMediaJob } from '@/lib/media/job-lease';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = serviceClient();
  // Recover abandoned leases before picking new work. An invocation may be
  // killed by the hosting runtime while a job remains marked "running".
  // Do not reset live leases, and never retry jobs past their maximum attempts.
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const { data: stale, error: staleError } = await db
    .from('jobs')
    .select('id,state,attempts,max_attempts,updated_at')
    .eq('type', 'media.transcode')
    .eq('state', 'running')
    .lt('updated_at', cutoff)
    .order('updated_at')
    .limit(10);
  if (staleError)
    return NextResponse.json({ error: 'Lease recovery unavailable' }, { status: 503 });
  for (const job of stale ?? []) {
    const nextState = expiredMediaLease(job);
    if (!nextState) continue;
    await db
      .from('jobs')
      .update({
        state: nextState,
        next_run_at: new Date().toISOString(),
        last_error:
          nextState === 'dead'
            ? 'Processing exceeded its retry limit after a stale lease.'
            : 'Recovered an abandoned media-processing lease.',
      })
      .eq('id', job.id)
      .eq('state', 'running')
      .eq('updated_at', job.updated_at);
  }

  const { data: jobs, error } = await db
    .from('jobs')
    .select('id,entity_id,payload,attempts,max_attempts,state')
    .eq('type', 'media.transcode')
    .in('state', ['queued', 'failed'])
    .lte('next_run_at', new Date().toISOString())
    .order('created_at')
    .limit(10);
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 });
  const results: Array<{ id: string; status: string }> = [];
  for (const job of jobs || []) {
    if (results.length >= 2) break;
    if (!mayClaimMediaJob(job)) continue;
    const { data: claimed } = await db
      .from('jobs')
      .update({ state: 'running', attempts: (job.attempts || 0) + 1 })
      .eq('id', job.id)
      .eq('state', job.state)
      .eq('attempts', job.attempts)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;
    try {
      const sourceKey = String(job.payload?.sourceKey || '');
      const trackId = String(job.entity_id || '');
      if (
        !/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(sourceKey) ||
        !/^[a-f0-9-]{36}$/.test(trackId)
      ) {
        throw new Error('Invalid queued media key');
      }
      const sourceUrl = presignR2Head(sourceKey);
      const head = await fetch(sourceUrl, { method: 'HEAD' });
      if (!head.ok) throw new Error('Original not found');
      const size = Number(head.headers.get('content-length') || 0);
      if (size < 1024 || size > env.audioMaxUploadBytes)
        throw new Error('Invalid audio size');
      const type = head.headers.get('content-type') || '';
      if (!['audio/mpeg', 'audio/mp3'].includes(type))
        throw new Error('Only MP3 is supported in serverless mode');
      // A signed HEAD URL cannot authorize GET; use a dedicated GET signer for originals.
      const { presignR2OriginalGet } = await import('@/lib/storage/r2-presign');
      const response = await fetch(presignR2OriginalGet(sourceKey));
      if (!response.ok) throw new Error('Could not read uploaded MP3');
      const audio = Buffer.from(await response.arrayBuffer());
      if (
        audio.length !== size ||
        (audio.subarray(0, 3).toString() !== 'ID3' && audio[0] !== 0xff)
      ) {
        throw new Error('Uploaded object is not a valid MP3 header');
      }
      const key = `${trackId}/${crypto.createHash('sha256').update(audio).digest('hex')}.mp3`;
      const stored = await fetch(presignR2StreamingPut(key), {
        method: 'PUT',
        body: audio,
      });
      if (!stored.ok) throw new Error('Could not store streaming copy');
      const { error: assetError } = await db
        .from('audio_assets')
        .update({
          kind: 'rendition',
          object_key: key,
          format: 'mp3',
          bytes: size,
          sha256: crypto.createHash('sha256').update(audio).digest('hex'),
          processing_status: 'ready',
        })
        .eq('track_id', trackId);
      if (assetError) throw assetError;
      await db
        .from('jobs')
        .update({ state: 'succeeded', last_error: null })
        .eq('id', job.id);
      results.push({ id: job.id, status: 'completed' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Processing failed';
      const retryAllowed = (job.attempts || 0) + 1 < (job.max_attempts || 3);
      const retryDelaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, job.attempts || 0));
      await db
        .from('jobs')
        .update({
          state: retryAllowed ? 'failed' : 'dead',
          last_error: message.slice(0, 500),
          next_run_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
        })
        .eq('id', job.id)
        .eq('state', 'running');
      results.push({ id: job.id, status: 'failed' });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
