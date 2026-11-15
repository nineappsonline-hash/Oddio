import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { presignR2Get } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Segment = { start: number; end: number; text: string };
function timestamp(value: number) {
  const ms = Math.max(0, Math.floor(value * 1000));
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return (
    [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':') +
    ',' +
    String(ms % 1000).padStart(3, '0')
  );
}
function makeSrt(segments: Segment[]) {
  return segments
    .filter(
      (s) =>
        s.text?.trim() &&
        Number.isFinite(s.start) &&
        Number.isFinite(s.end) &&
        s.end > s.start,
    )
    .slice(0, 3000)
    .map(
      (s, i) =>
        `${i + 1}\n${timestamp(s.start)} --> ${timestamp(s.end)}\n${s.text.trim()}`,
    )
    .join('\n\n');
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let claimed = false;
  let id = '';
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit('generate-lyrics:' + user.id, 3, 60 * 60_000);
    ({ id } = await params);
    if (!process.env.GROQ_API_KEY)
      return jsonOk({
        status: 'unavailable',
        message: 'AI transcription is not configured.',
      });
    const db = serviceClient();
    const { data: track, error } = await db
      .from('tracks')
      .select('id,synced_lyrics_srt,lyrics_text,publish_status,visibility')
      .eq('id', id)
      .single();
    if (
      error ||
      !track ||
      track.publish_status !== 'published' ||
      track.visibility !== 'public'
    )
      return jsonOk({ status: 'unavailable' });
    if (track.synced_lyrics_srt || track.lyrics_text)
      return jsonOk({
        status: 'ready',
        srt: track.synced_lyrics_srt,
        text: track.lyrics_text,
      });
    // Recover abandoned jobs after a function timeout; preserve completed jobs.
    await db
      .from('track_lyrics_jobs')
      .delete()
      .eq('track_id', id)
      .eq('status', 'processing')
      .lt('created_at', new Date(Date.now() - 3 * 60_000).toISOString());
    const { error: claimError } = await db
      .from('track_lyrics_jobs')
      .insert({ track_id: id, status: 'processing' });
    if (claimError) {
      if (claimError.code === '23505') return jsonOk({ status: 'processing' });
      throw claimError;
    }
    claimed = true;
    const { data: assets, error: assetError } = await db
      .from('audio_assets')
      .select('object_key,bytes,format')
      .eq('track_id', id)
      .eq('kind', 'rendition')
      .eq('processing_status', 'ready')
      .limit(1);
    if (assetError) throw assetError;
    const asset = assets?.[0];
    if (!asset) throw new Error('No ready audio rendition');
    // Groq's transcription endpoint accepts files up to 25 MB.
    if (Number(asset.bytes) > 24 * 1024 * 1024)
      throw new Error('Audio is too large for the transcription provider');
    const audio = await fetch(presignR2Get(asset.object_key), {
      signal: AbortSignal.timeout(20000),
    });
    if (!audio.ok) throw new Error('Audio download failed');
    const bytes = await audio.arrayBuffer();
    if (bytes.byteLength > 24 * 1024 * 1024)
      throw new Error('Audio exceeds transcription limit');
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: 'audio/mpeg' }), 'track.mp3');
    form.set('model', 'whisper-large-v3');
    form.set('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    const result = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: form,
      signal: AbortSignal.timeout(35000),
    });
    if (!result.ok) throw new Error('Transcription provider returned ' + result.status);
    const output = (await result.json()) as { text?: string; segments?: Segment[] };
    const srt = makeSrt(output.segments ?? []);
    if (!srt) throw new Error('No synchronized lyrics detected');
    // Do not overwrite any lyrics the artist/admin saved while transcription ran.
    const { data: saved, error: saveError } = await db
      .from('tracks')
      .update({ synced_lyrics_srt: srt, lyrics_text: output.text?.trim() || null })
      .eq('id', id)
      .is('synced_lyrics_srt', null)
      .is('lyrics_text', null)
      .select('id')
      .maybeSingle();
    if (saveError) throw saveError;
    await db
      .from('track_lyrics_jobs')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('track_id', id);
    return jsonOk({
      status: 'ready',
      srt: saved ? srt : null,
      text: saved ? output.text : null,
    });
  } catch (error) {
    if (claimed && id)
      await serviceClient()
        .from('track_lyrics_jobs')
        .delete()
        .eq('track_id', id)
        .eq('status', 'processing');
    return jsonError(error);
  }
}
