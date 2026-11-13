import crypto from 'node:crypto';
import { z } from 'zod';
import { trackDraftInput } from '@ai-music/contracts';
import {
  assertUploadAttestations,
  RIGHTS_AUDIT_ACTION,
} from '@/lib/moderation/upload-attestations';
import { audit } from '@/lib/data/db';
import { getSessionUser } from '@/lib/auth/session';
import { assertSameOrigin, jsonError, jsonOk, rateLimit } from '@/lib/api-helpers';
import { AppError, Errors } from '@/lib/errors';
import { env, demoMode } from '@/lib/env';
import {
  loadDbFromSupabase,
  persistChanges,
  serviceClient,
} from '@/lib/data/supabase-store';
import { createTrackFromUpload } from '@/lib/data/mutations';
import { presignR2Head, presignR2OriginalGet } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';

const schema = trackDraftInput.extend({
  objectKey: z.string().min(1),
  bytes: z.coerce.number().int().positive(),
  contentType: z.string().max(120),
  releaseAt: z.string().datetime({ offset: true }).optional(),
  artworkAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#9D5CFF'),
});
function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Direct finalize requires production storage');
    const user = await getSessionUser();
    if (!user) throw Errors.unauthorized();
    if (!user.isArtistManager) throw Errors.forbidden();
    rateLimit(`finalize:${user.id}`, 12, 60 * 60_000);
    const form = await request.formData();
    assertUploadAttestations({
      rightsConfirmed: field(form, 'rightsConfirmed'),
      voiceConfirmed: field(form, 'voiceConfirmed'),
    });
    const input = schema.parse({
      artistId: field(form, 'artistId'),
      albumId: field(form, 'albumId') || undefined,
      title: field(form, 'title'),
      description: field(form, 'description'),
      genreId: field(form, 'genreId'),
      moodIds: field(form, 'moods').split(',').filter(Boolean),
      languageCode: field(form, 'languageCode') || 'en',
      countryCode: field(form, 'countryCode'),
      productionType: field(form, 'productionType') || 'fully_ai',
      aiTools: field(form, 'aiTools'),
      lyrics: field(form, 'lyrics'),
      credits: field(form, 'credits'),
      visibility: field(form, 'visibility') || 'public',
      releaseAt: field(form, 'releaseAt') || undefined,
      artworkAccent: field(form, 'artworkAccent') || '#9D5CFF',
      objectKey: field(form, 'objectKey'),
      bytes: field(form, 'bytes'),
      contentType: field(form, 'contentType'),
    });
    if (!new RegExp(`^incoming/${user.id}/[a-f0-9-]{36}$`).test(input.objectKey)) {
      throw Errors.forbidden();
    }
    if (input.bytes > Math.min(env.audioMaxUploadBytes, 25 * 1024 * 1024))
      throw Errors.invalid('Audio exceeds upload limit');
    if (!['audio/mpeg', 'audio/mp3'].includes(input.contentType)) {
      throw Errors.invalid('Unsupported audio format');
    }
    const head = await fetch(presignR2Head(input.objectKey), {
      method: 'HEAD',
      cache: 'no-store',
    });
    if (!head.ok)
      throw new AppError('upload_not_found', 'Audio upload was not found in R2.', 422);
    const storedBytes = Number(head.headers.get('content-length'));
    if (
      !Number.isSafeInteger(storedBytes) ||
      storedBytes <= 0 ||
      storedBytes !== input.bytes
    ) {
      throw Errors.invalid('Stored audio size does not match the uploaded file');
    }
    // Hash the actual R2 bytes, never trust a client-supplied checksum.
    // Stream rather than buffering a potentially 100 MB audio file in memory.
    const original = await fetch(presignR2OriginalGet(input.objectKey), {
      cache: 'no-store',
    });
    if (!original.ok || !original.body) {
      throw new AppError(
        'upload_unreadable',
        'Unable to verify the uploaded audio.',
        422,
      );
    }
    const hasher = crypto.createHash('sha256');
    let verifiedBytes = 0;
    const reader = original.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value;
      const bytes = Buffer.from(chunk);
      verifiedBytes += bytes.length;
      if (verifiedBytes > env.audioMaxUploadBytes) {
        throw Errors.invalid('Audio exceeds upload limit');
      }
      hasher.update(bytes);
    }
    if (verifiedBytes !== storedBytes) {
      throw Errors.invalid('Uploaded audio could not be verified');
    }
    const verifiedSha256 = hasher.digest('hex');
    const { data: duplicates, error: duplicateError } = await serviceClient()
      .from('audio_assets')
      .select('track_id')
      .eq('kind', 'original')
      .eq('sha256', verifiedSha256)
      .limit(1);
    if (duplicateError) throw new Error(duplicateError.message);
    if (duplicates?.length) {
      throw new AppError(
        'duplicate_audio',
        'This exact audio file has already been uploaded.',
        409,
      );
    }
    const before = await loadDbFromSupabase();
    const after = structuredClone(before);
    const track = createTrackFromUpload(after, user, {
      artistId: input.artistId,
      albumId: input.albumId || null,
      title: input.title,
      description: input.description,
      genreId: input.genreId,
      moodIds: input.moodIds,
      languageCode: input.languageCode,
      countryCode: input.countryCode,
      productionType: input.productionType,
      aiTools: input.aiTools,
      lyrics: input.lyrics,
      credits: input.credits,
      visibility: input.visibility,
      releaseAt: input.releaseAt || null,
      durationMs: 0,
      qualityLabel: 'pending',
      artworkUrl: '',
      artworkAccent: input.artworkAccent,
      audio: {
        kind: 'original',
        objectKey: input.objectKey,
        format:
          input.contentType === 'audio/mpeg'
            ? 'mp3'
            : input.contentType.split('/')[1] || 'unknown',
        // Provisional nonzero metadata required by audio_assets CHECK constraints.
        // Worker replaces these with ffprobe measurements.
        bitrateKbps: 1,
        sampleRate: 1,
        channels: 2,
        bytes: storedBytes,
        sha256: verifiedSha256,
        processingStatus: 'pending',
      },
      idempotencyKey: `r2:${input.objectKey}`,
      dailyLimit: env.uploadDailyLimit,
    });
    if (
      !after.auditLogs.some(
        (entry) => entry.entityId === track.id && entry.action === RIGHTS_AUDIT_ACTION,
      )
    ) {
      audit(after, user, RIGHTS_AUDIT_ACTION, 'track', track.id);
    }
    // Artist profiles reference tracks through featured_track_id. Persist the new
    // track before setting that foreign key, otherwise Postgres rejects the artist upsert.
    const featuredArtist = after.artists.find((artist) => artist.id === track.artistId);
    const previousArtist = before.artists.find((artist) => artist.id === track.artistId);
    const shouldFeature = Boolean(
      featuredArtist &&
      previousArtist &&
      featuredArtist.featuredTrackId === track.id &&
      previousArtist.featuredTrackId === null,
    );
    if (shouldFeature && featuredArtist) featuredArtist.featuredTrackId = null;
    await persistChanges(before, after);
    if (shouldFeature) {
      const { error: featureError } = await serviceClient()
        .from('artists')
        .update({ featured_track_id: track.id })
        .eq('id', track.artistId);
      if (featureError)
        throw new Error(`Unable to feature new track: ${featureError.message}`);
    }
    const { error } = await serviceClient()
      .from('jobs')
      .upsert(
        {
          type: 'media.transcode',
          entity_id: track.id,
          idempotency_key: `media:${track.id}`,
          payload: {
            trackId: track.id,
            sourceBucket: 'ai-music-originals',
            targetBucket: 'ai-music-streaming',
            sourceKey: input.objectKey,
          },
        },
        { onConflict: 'idempotency_key' },
      );
    if (error) throw new Error(`Unable to queue audio processing: ${error.message}`);
    return jsonOk({
      id: track.id,
      reviewStatus: track.reviewStatus,
      processingStatus: 'pending',
    });
  } catch (error) {
    return jsonError(error);
  }
}
