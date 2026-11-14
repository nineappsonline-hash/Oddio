import crypto from 'node:crypto';
import { z } from 'zod';
import { assertSameOrigin, jsonError, jsonOk, parseBody, requireRole } from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode, env } from '@/lib/env';
import { presignR2Head, presignR2OriginalGet } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ jobId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireRole(['admin', 'super_admin']);
    if (demoMode) return jsonOk({ recovered: false, reason: 'unavailable_in_demo' }, undefined, 409);
    const { jobId } = await parseBody(request, schema);
    const db = serviceClient();
    const { data: job, error: jobError } = await db.from('jobs')
      .select('id,entity_id,type,state,attempts,max_attempts,payload')
      .eq('id', jobId).eq('type', 'media.transcode').maybeSingle();
    if (jobError) throw jobError;
    if (!job || job.state !== 'failed' || !job.entity_id) {
      return jsonOk({ recovered: false, reason: 'job_not_failed' }, undefined, 409);
    }
    const payload = job.payload as Record<string, unknown>;
    const key = payload.sourceKey;
    if (typeof key !== 'string' || !/^incoming\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key)
      || payload.trackId !== job.entity_id || payload.sourceBucket !== 'ai-music-originals') {
      return jsonOk({ recovered: false, reason: 'invalid_source' }, undefined, 409);
    }
    const { data: existing, error: existingError } = await db.from('audio_assets')
      .select('id').eq('track_id', job.entity_id).eq('kind', 'original').limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return jsonOk({ recovered: false, reason: 'asset_already_exists' }, undefined, 409);

    const head = await fetch(presignR2Head(key), { method: 'HEAD', cache: 'no-store' });
    if (!head.ok) return jsonOk({ recovered: false, reason: 'r2_object_unavailable' }, undefined, 422);
    const expectedBytes = Number(head.headers.get('content-length'));
    if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0 || expectedBytes > env.audioMaxUploadBytes) {
      return jsonOk({ recovered: false, reason: 'invalid_audio_size' }, undefined, 422);
    }
    const response = await fetch(presignR2OriginalGet(key), { cache: 'no-store' });
    if (!response.ok || !response.body) return jsonOk({ recovered: false, reason: 'r2_read_failed' }, undefined, 422);
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > expectedBytes) {
        await reader.cancel();
        throw new Error('R2 audio size changed during verification');
      }
      hash.update(value);
    }
    if (bytes !== expectedBytes) throw new Error('R2 audio size mismatch');
    const sha256 = hash.digest('hex');
    const { data: duplicates, error: duplicateError } = await db.from('audio_assets')
      .select('track_id').eq('kind', 'original').eq('sha256', sha256).limit(1);
    if (duplicateError) throw duplicateError;
    if (duplicates?.length) return jsonOk({ recovered: false, reason: 'duplicate_audio' }, undefined, 409);

    const { error: insertError } = await db.from('audio_assets').insert({
      track_id: job.entity_id, kind: 'original', object_key: key, format: 'mp3',
      bitrate_kbps: 1, sample_rate: 1, channels: 2, bytes, sha256, processing_status: 'pending',
    });
    if (insertError) throw insertError;
    const { data: updated, error: updateError } = await db.from('jobs')
      .update({ state: 'queued', attempts: 0, last_error: '', next_run_at: new Date().toISOString() })
      .eq('id', job.id).eq('state', 'failed').eq('attempts', job.attempts)
      .select('id').maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return jsonOk({ recovered: false, reason: 'job_changed_asset_restored' }, undefined, 409);
    const { error: auditError } = await db.from('audit_logs').insert({
      actor_id: actor.id, action: 'media.original_restored', entity_type: 'track', entity_id: job.entity_id,
    });
    if (auditError) console.error('[media-recovery] audit failed', auditError);
    return jsonOk({ recovered: true, queued: true, bytes, auditRecorded: !auditError });
  } catch (error) {
    return jsonError(error);
  }
}
