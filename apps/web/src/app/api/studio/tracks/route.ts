import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assessAudioQuality } from '@ai-music/audio';
import { trackDraftInput } from '@ai-music/contracts';
import { audioPolicy, env, demoMode } from '@/lib/env';
import { probeAudio, transcodeToMp3 } from '@/lib/audio/probe';
import { mutateDb, uploadDir } from '@/lib/data/db';
import { createTrackFromUpload } from '@/lib/data/mutations';
import { getSessionUser } from '@/lib/auth/session';
import { AppError, Errors } from '@/lib/errors';
import { assertSameOrigin, jsonError, jsonOk, rateLimit } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const formSchema = trackDraftInput.extend({
  releaseAt: z.string().datetime({ offset: true }).optional(),
  artworkAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#9D5CFF'),
});

const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  const created: string[] = [];
  try {
    if (!demoMode) {
      throw new AppError(
        'production_upload_requires_finalize',
        'Production uploads must use the verified R2 direct-upload and finalize flow; publishing is not available yet.',
        503,
      );
    }
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) throw Errors.unauthorized();
    if (!user.isArtistManager) {
      throw new AppError(
        'artist_application_required',
        'An approved artist application is required.',
        403,
      );
    }
    rateLimit(`upload:${user.id}`, 12, 60 * 60_000);

    const form = await request.formData();
    const audioFile = form.get('audio');
    if (!(audioFile instanceof File) || audioFile.size === 0) {
      throw Errors.invalid('Choose an audio file to upload');
    }
    if (audioFile.size > env.audioMaxUploadBytes) {
      throw Errors.invalid(
        `File is too large. Limit is ${(env.audioMaxUploadBytes / 1024 / 1024).toFixed(0)} MB`,
      );
    }

    const moods = field(form, 'moods')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const parsed = formSchema.parse({
      artistId: field(form, 'artistId'),
      albumId: field(form, 'albumId') || undefined,
      title: field(form, 'title'),
      genreId: field(form, 'genreId'),
      moodIds: moods,
      languageCode: field(form, 'languageCode') || 'en',
      countryCode: field(form, 'countryCode'),
      productionType: field(form, 'productionType') || 'fully_ai',
      aiTools: field(form, 'aiTools'),
      lyrics: field(form, 'lyrics'),
      credits: field(form, 'credits'),
      visibility: field(form, 'visibility') || 'public',
      description: field(form, 'description'),
      releaseAt: field(form, 'releaseAt') || undefined,
    });

    const dir = uploadDir();
    const tempPath = path.join(dir, `upload-${crypto.randomUUID()}.tmp`);
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);
    created.push(tempPath);

    const probe = await probeAudio(tempPath);
    const decision = assessAudioQuality(probe, audioPolicy());
    if (!decision.accepted) {
      throw new AppError('audio_quality_rejected', decision.reasons.join(' '), 422);
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const extension = (probe.format || 'mp3').replace('mpeg', 'mp3');
    const originalPath = path.join(dir, `${sha256}.original.${extension}`);
    fs.renameSync(tempPath, originalPath);
    created[created.length - 1] = originalPath;

    let playablePath = originalPath;
    if (decision.transcodeTarget) {
      const renditionPath = path.join(dir, `${sha256}-${decision.transcodeTarget}.mp3`);
      await transcodeToMp3(
        originalPath,
        renditionPath,
        decision.transcodeTarget,
        env.audioMaxDurationSeconds,
      );
      created.push(renditionPath);
      playablePath = renditionPath;
    }

    let artworkUrl = '';
    const artwork = form.get('artwork');
    if (artwork instanceof File && artwork.size > 0) {
      if (artwork.size > MAX_ARTWORK_BYTES)
        throw Errors.invalid('Artwork must be under 5 MB');
      const ext = IMAGE_TYPES[artwork.type];
      if (!ext) throw Errors.invalid('Artwork must be PNG, JPEG, WEBP or GIF');
      const filename = `artwork-${crypto.randomUUID()}.${ext}`;
      const artworkPath = path.join(dir, filename);
      fs.writeFileSync(artworkPath, Buffer.from(await artwork.arrayBuffer()));
      created.push(artworkPath);
      artworkUrl = `/api/artwork/${filename}`;
    }

    const objectKey = `uploads/${path.basename(playablePath)}`;
    const releaseAt =
      parsed.releaseAt && parsed.releaseAt.length > 0
        ? new Date(parsed.releaseAt).toISOString()
        : null;

    const track = mutateDb((db) =>
      createTrackFromUpload(db, user, {
        artistId: parsed.artistId,
        albumId: parsed.albumId || null,
        title: parsed.title,
        description: parsed.description,
        genreId: parsed.genreId,
        moodIds: parsed.moodIds,
        languageCode: parsed.languageCode,
        countryCode: parsed.countryCode,
        productionType: parsed.productionType,
        aiTools: parsed.aiTools,
        lyrics: parsed.lyrics,
        credits: parsed.credits,
        visibility: parsed.visibility,
        releaseAt,
        durationMs: Math.round(probe.durationSec * 1000),
        qualityLabel: decision.qualityLabel,
        artworkUrl,
        artworkAccent: parsed.artworkAccent,
        audio: {
          kind: decision.serveOriginal ? 'original' : 'rendition',
          objectKey,
          format: decision.serveOriginal ? probe.format : 'mp3',
          bitrateKbps: decision.serveOriginal
            ? probe.bitrateKbps
            : (decision.transcodeTarget ?? 320),
          sampleRate: probe.sampleRate,
          channels: probe.channels,
          bytes: fs.statSync(playablePath).size,
          sha256,
          processingStatus: 'ready',
        },
        idempotencyKey: `upload:${user.id}:${sha256}:${new Date().toISOString().slice(0, 10)}`,
        dailyLimit: env.uploadDailyLimit,
      }),
    );

    return jsonOk({
      track,
      quality: {
        label: decision.qualityLabel,
        transcoded: Boolean(decision.transcodeTarget),
      },
    });
  } catch (error) {
    for (const file of created) {
      try {
        fs.rmSync(file, { force: true });
      } catch {
        // best-effort cleanup
      }
    }
    return jsonError(error);
  }
}

export async function GET() {
  return NextResponse.json(
    { error: { code: 'method_not_allowed', message: 'Use POST.' } },
    { status: 405 },
  );
}
