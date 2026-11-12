import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/data/supabase-store';
import { presignR2Head, presignR2StreamingPut } from '@/lib/storage/r2-presign';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = serviceClient();
  const { data: jobs, error } = await db.from('jobs')
    .select('id,entity_id,payload,attempts')
    .eq('type', 'media.transcode').eq('state', 'queued')
    .lte('next_run_at', new Date().toISOString()).order('created_at').limit(2);
  if (error) return NextResponse.json({ error: 'Queue unavailable' }, { status: 503 });
  const results: Array<{ id: string; status: string }> = [];
  for (const job of jobs || []) {
    const { data: claimed } = await db.from('jobs').update({ state: 'running', attempts: (job.attempts || 0) + 1 })
      .eq('id', job.id).eq('state', 'queued').select('id').maybeSingle();
    if (!claimed) continue;
    try {
      const sourceKey = String(job.payload?.sourceKey || '');
      const trackId = String(job.entity_id || '');
      if (!/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(sourceKey) || !/^[a-f0-9-]{36}$/.test(trackId)) {
        throw new Error('Invalid queued media key');
      }
      const sourceUrl = presignR2Head(sourceKey);
      const head = await fetch(sourceUrl, { method: 'HEAD' });
      if (!head.ok) throw new Error('Original not found');
      const size = Number(head.headers.get('content-length') || 0);
      if (size < 1024 || size > env.audioMaxUploadBytes) throw new Error('Invalid audio size');
      const type = head.headers.get('content-type') || '';
      if (!['audio/mpeg', 'audio/mp3'].includes(type)) throw new Error('Only MP3 is supported in serverless mode');
      // A signed HEAD URL cannot authorize GET; use a dedicated GET signer for originals.
      const { presignR2OriginalGet } = await import('@/lib/storage/r2-presign');
      const response = await fetch(presignR2OriginalGet(sourceKey));
      if (!response.ok) throw new Error('Could not read uploaded MP3');
      const audio = Buffer.from(await response.arrayBuffer());
      if (audio.length !== size || (audio.subarray(0, 3).toString() !== 'ID3' && audio[0] !== 0xff)) {
        throw new Error('Uploaded object is not a valid MP3 header');
      }
      const key = `${trackId}/${crypto.createHash('sha256').update(audio).digest('hex')}.mp3`;
      const stored = await fetch(presignR2StreamingPut(key), { method: 'PUT', body: audio });
      if (!stored.ok) throw new Error('Could not store streaming copy');
      const { error: assetError } = await db.from('audio_assets').update({
        kind: 'rendition', object_key: key, format: 'mp3', bytes: size,
        sha256: crypto.createHash('sha256').update(audio).digest('hex'),
        processing_status: 'ready',
      }).eq('track_id', trackId);
      if (assetError) throw assetError;
      await db.from('jobs').update({ state: 'succeeded', last_error: null }).eq('id', job.id);
      results.push({ id: job.id, status: 'completed' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Processing failed';
      await db.from('jobs').update({ state: 'failed', last_error: message.slice(0, 500) }).eq('id', job.id);
      results.push({ id: job.id, status: 'failed' });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
