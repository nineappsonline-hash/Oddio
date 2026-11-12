#!/usr/bin/env node
/**
 * Project AI Music — media worker.
 *
 * Production mode (Supabase configured):
 *   claims jobs from public.jobs via the claim_jobs() RPC, transcodes masters
 *   from the private audio-masters bucket into 320 kbps MP3 renditions in
 *   audio-renditions, promotes scheduled releases and expires playback
 *   sessions. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and ffmpeg.
 *
 * Demo mode (no Supabase URL):
 *   operates on apps/web/.data/demo.json: processes pending local audio,
 *   promotes scheduled tracks/albums, expires stale sessions and removes
 *   abandoned upload temp files.
 *
 * Usage: node workers/media/src/index.mjs [--once] [--interval=15000]
 */

import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const DEMO_DB = process.env.DEMO_DB_PATH
  ? path.resolve(process.env.DEMO_DB_PATH)
  : path.join(REPO_ROOT, 'apps/web/.data/demo.json');
const DEMO_UPLOADS = path.join(REPO_ROOT, 'apps/web/.data/uploads');

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TARGET_BITRATE = Number(process.env.AUDIO_TARGET_BITRATE_KBPS || 320);
const MAX_DURATION = Number(process.env.AUDIO_MAX_DURATION_SECONDS || 900);
const MIN_BITRATE = Number(process.env.AUDIO_MIN_BITRATE_KBPS || 256);
const BATCH = Number(process.env.MEDIA_WORKER_BATCH || 5);
const EMAIL_API_URL = process.env.EMAIL_API_URL || 'https://api.resend.com/emails';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');
const EMAIL_BATCH = Number(process.env.EMAIL_BATCH || 10);
const EMAIL_ENABLED = Boolean(EMAIL_API_KEY && EMAIL_FROM);
const RUN_ONCE = process.argv.includes('--once');
const INTERVAL = Math.max(
  2_000,
  Number(
    (process.argv.find((arg) => arg.startsWith('--interval=')) || '').split('=')[1] ||
      15_000,
  ),
);

const workerId = crypto.randomUUID().slice(0, 8);
const demoMode = !SUPABASE_URL || !SERVICE_KEY;

function log(level, message, extra = {}) {
  const line = {
    ts: new Date().toISOString(),
    level,
    worker: workerId,
    mode: demoMode ? 'demo' : 'production',
    message,
    ...extra,
  };
  const body = JSON.stringify(line);
  if (level === 'error') process.stderr.write(body + '\n');
  else process.stdout.write(body + '\n');
}

async function probe(filePath) {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout);
  const stream = (parsed.streams || []).find((item) => item.codec_type === 'audio');
  if (!stream) throw new Error('No audio stream found');
  const size = Number(parsed.format?.size || 0);
  const durationSec = Number(parsed.format?.duration || 0);
  return {
    format: String(parsed.format?.format_name || '').split(',')[0],
    codec: stream.codec_name || 'unknown',
    bitrateKbps:
      Number(parsed.format?.bit_rate || stream.bit_rate || 0) > 0
        ? Math.round(Number(parsed.format?.bit_rate || stream.bit_rate) / 1000)
        : 0,
    sampleRate: Number(stream.sample_rate || 0),
    channels: Number(stream.channels || 2),
    durationSec,
    bytes: size,
    size,
  };
}

async function transcode(inputPath, outputPath) {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(MAX_DURATION),
      '-vn',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      `${TARGET_BITRATE}k`,
      '-ar',
      '44100',
      '-ac',
      '2',
      outputPath,
    ],
    { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 },
  );
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
  return hash.digest('hex');
}

/* -------------------------------------------------------------------------- */
/* Demo mode                                                                   */
/* -------------------------------------------------------------------------- */

function maybeTranscodeDemoTrack(track) {
  return track.audio && ['pending', 'processing'].includes(track.audio.processingStatus);
}

async function processDemoTrack(track, dir) {
  if (!maybeTranscodeDemoTrack(track)) return false;
  const source = path.resolve(REPO_ROOT, 'apps/web/.data', track.audio.objectKey);
  if (!source.startsWith(path.resolve(REPO_ROOT, 'apps/web/.data') + path.sep)) {
    throw new Error('Unsafe object key');
  }
  if (!fs.existsSync(source)) {
    track.audio.processingStatus = 'failed';
    track.updatedAt = new Date().toISOString();
    log('warn', 'demo transcode source missing', {
      trackId: track.id,
      source: track.audio.objectKey,
    });
    return true;
  }

  const info = await probe(source);
  if (info.durationSec > MAX_DURATION)
    throw new Error(`Source is longer than ${MAX_DURATION}s`);
  if (info.format !== 'mp3' && info.bitrateKbps > 0 && info.bitrateKbps < MIN_BITRATE) {
    throw new Error(
      `Source bitrate ${info.bitrateKbps} kbps is below ${MIN_BITRATE} kbps`,
    );
  }

  if (info.format === 'mp3' && info.bitrateKbps >= TARGET_BITRATE - 4) {
    track.audio.processingStatus = 'ready';
    track.audio.bitrateKbps = info.bitrateKbps;
    track.audio.sampleRate = info.sampleRate;
    track.audio.channels = info.channels;
    track.audio.bytes = info.size;
    track.audio.sha256 = await sha256File(source);
    track.qualityLabel = 'high';
    track.updatedAt = new Date().toISOString();
    return true;
  }

  const hash = await sha256File(source);
  const outputName = `${hash}-${TARGET_BITRATE}.mp3`;
  const output = path.join(dir, outputName);
  if (!fs.existsSync(output)) await transcode(source, output);
  const rendered = await probe(output);

  track.audio = {
    kind: 'rendition',
    objectKey: `uploads/${outputName}`,
    format: 'mp3',
    bitrateKbps: TARGET_BITRATE,
    sampleRate: rendered.sampleRate || 44100,
    channels: rendered.channels || 2,
    bytes: rendered.bytes,
    sha256: hash,
    processingStatus: 'ready',
  };
  track.durationMs = Math.round(rendered.durationSec * 1000);
  track.qualityLabel = 'high';
  track.updatedAt = new Date().toISOString();
  log('info', 'demo track transcoded', { trackId: track.id, output: outputName });
  return true;
}

async function runDemoOnce() {
  if (!fs.existsSync(DEMO_DB)) {
    log('warn', 'demo database not found; run npm run setup:demo first', {
      path: DEMO_DB,
    });
    return { changed: false };
  }
  await fsp.mkdir(DEMO_UPLOADS, { recursive: true });
  const db = JSON.parse(await fsp.readFile(DEMO_DB, 'utf8'));
  const now = Date.now();
  let changed = false;

  for (const track of db.tracks || []) {
    if (
      track.publishStatus === 'scheduled' &&
      track.reviewStatus === 'approved' &&
      new Date(track.releaseAt).getTime() <= now
    ) {
      track.publishStatus = 'published';
      track.updatedAt = new Date().toISOString();
      changed = true;
      log('info', 'demo scheduled track published', { trackId: track.id });
    }
  }
  for (const album of db.albums || []) {
    if (album.status === 'scheduled' && new Date(album.releaseAt).getTime() <= now) {
      album.status = 'published';
      changed = true;
      log('info', 'demo scheduled album published', { albumId: album.id });
    }
  }

  for (const track of db.tracks || []) {
    try {
      if (await processDemoTrack(track, DEMO_UPLOADS)) changed = true;
    } catch (error) {
      track.audio = track.audio || {};
      track.audio.processingStatus = 'failed';
      changed = true;
      log('error', 'demo track processing failed', {
        trackId: track.id,
        error: String(error.message || error),
      });
    }
  }

  const before = (db.playbackSessions || []).length;
  db.playbackSessions = (db.playbackSessions || []).filter(
    (session) =>
      now - new Date(session.lastSeenAt || session.startedAt).getTime() <
      24 * 3600 * 1000,
  );
  if (db.playbackSessions.length !== before) changed = true;

  if (fs.existsSync(DEMO_UPLOADS)) {
    const cutoff = now - 3600 * 1000;
    for (const name of await fsp.readdir(DEMO_UPLOADS)) {
      if (!name.startsWith('upload-') || !name.endsWith('.tmp')) continue;
      const full = path.join(DEMO_UPLOADS, name);
      const stat = await fsp.stat(full);
      if (stat.mtimeMs < cutoff) {
        await fsp.rm(full, { force: true });
        log('info', 'removed abandoned upload temp', { file: name });
      }
    }
  }

  if (changed) {
    const tmp = `${DEMO_DB}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(db, null, 2));
    await fsp.rename(tmp, DEMO_DB);
    log('info', 'demo database updated');
  }
  return { changed };
}

/* -------------------------------------------------------------------------- */
/* Production mode (Supabase REST + Storage, no extra dependencies)            */
/* -------------------------------------------------------------------------- */

const AUTH = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function rest(method, route, body) {
  const response = await fetch(`${SUPABASE_URL}${route}`, {
    method,
    headers: {
      ...AUTH,
      'Content-Type': 'application/json',
      ...(method === 'POST' || method === 'PATCH'
        ? { Prefer: 'return=representation' }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${method} ${route} -> ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function rpc(name, args) {
  return rest('POST', `/rest/v1/rpc/${name}`, args);
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
function r2SignedUrl(method, bucket, key) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 worker credentials missing');
  }
  if (!['ai-music-originals', 'ai-music-streaming'].includes(bucket)) throw new Error('Invalid R2 bucket');
  if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.includes('..')) throw new Error('Invalid R2 key');
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const date = new Date().toISOString().replace(/[:-]|\\.\\d{3}/g, '');
  const short = date.slice(0, 8);
  const scope = `${short}/auto/s3/aws4_request`;
  const path = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${scope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': '300',
    'X-Amz-SignedHeaders': 'host',
  };
  const query = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
  const hmac = (k, v) => crypto.createHmac('sha256', k).update(v).digest();
  const canonical = [method, path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const string = ['AWS4-HMAC-SHA256', date, scope, hash(canonical)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, short), 'auto'), 's3'), 'aws4_request');
  return `https://${host}${path}?${query}&X-Amz-Signature=${crypto.createHmac('sha256', signingKey).update(string).digest('hex')}`;
}
async function storageDownload(bucket, objectKey, target) {
  const response = await fetch(r2SignedUrl('GET', bucket, objectKey));
  if (!response.ok) throw new Error(`R2 download failed: ${response.status}`);
  await fsp.writeFile(target, Buffer.from(await response.arrayBuffer()));
}
async function storageUpload(bucket, objectKey, filePath) {
  const response = await fetch(r2SignedUrl('PUT', bucket, objectKey), {
    method: 'PUT', body: await fsp.readFile(filePath),
  });
  if (!response.ok) throw new Error(`R2 upload failed: ${response.status}`);
}

async function handleTranscode(job) {
  const payload = job.payload || {};
  const sourceBucket = payload.sourceBucket || 'audio-masters';
  const targetBucket = payload.targetBucket || 'audio-renditions';
  const sourceKey = payload.sourceKey || payload.objectKey;
  const trackId = payload.trackId || job.entity_id;
  if (!sourceKey) throw new Error('transcode job is missing sourceKey');

  const work = await fsp.mkdtemp(path.join(os.tmpdir(), 'aim-media-'));
  const input = path.join(work, 'source');
  const output = path.join(work, 'rendition.mp3');
  try {
    await storageDownload(sourceBucket, sourceKey, input);
    const info = await probe(input);
    if (info.durationSec > MAX_DURATION)
      throw new Error(`Source exceeds ${MAX_DURATION}s`);
    if (info.format !== 'mp3' && info.bitrateKbps > 0 && info.bitrateKbps < MIN_BITRATE) {
      throw new Error(
        `Source bitrate ${info.bitrateKbps} kbps is below ${MIN_BITRATE} kbps`,
      );
    }

    await transcode(input, output);
    const hash = await sha256File(output);
    const objectKey = `${trackId}/${hash}-${TARGET_BITRATE}.mp3`;
    const bitrate = TARGET_BITRATE;
    await storageUpload(targetBucket, objectKey, output);
    const rendered = await probe(output);

    if (payload.assetId) {
      await rest(
        'PATCH',
        `/rest/v1/audio_assets?id=eq.${encodeURIComponent(payload.assetId)}`,
        {
          object_key: objectKey,
          format: 'mp3',
          bitrate_kbps: bitrate,
          sample_rate: rendered.sampleRate || 44100,
          channels: rendered.channels || 2,
          bytes: rendered.size || rendered.bytes,
          processing_status: 'ready',
          ...(hash ? { sha256: hash } : {}),
        },
      );
    } else if (trackId) {
      await rest('POST', '/rest/v1/audio_assets', {
        track_id: trackId,
        kind: 'rendition',
        object_key: objectKey,
        format: 'mp3',
        bitrate_kbps: bitrate,
        sample_rate: rendered.sampleRate || 44100,
        channels: rendered.channels || 2,
        bytes: rendered.size || rendered.bytes,
        sha256: hash || crypto.createHash('sha256').update(sourceKey).digest('hex'),
        processing_status: 'ready',
      });
    }

    if (trackId) {
      await rest('PATCH', `/rest/v1/tracks?id=eq.${encodeURIComponent(trackId)}`, {
        duration_ms: Math.round((rendered.durationSec || info.durationSec) * 1000),
        quality_label: bitrate >= 320 ? 'high' : 'standard',
      });
    }
    log('info', 'transcode complete', { jobId: job.id, trackId, objectKey, bitrate });
  } finally {
    await fsp.rm(work, { recursive: true, force: true });
  }
}

async function handleJob(job) {
  switch (job.type) {
    case 'media.transcode':
      return handleTranscode(job);
    case 'publication.promote': {
      const tracks = await rpc('promote_scheduled_tracks', {});
      const albums = await rpc('promote_scheduled_albums', {});
      log('info', 'scheduled publications promoted', {
        tracks: tracks?.length || 0,
        albums: albums?.length || 0,
      });
      return;
    }
    case 'playback.cleanup': {
      const deleted = await rpc('expire_stale_playback_sessions', {});
      await rpc('recompute_unique_listeners', {
        p_date: job.payload?.date || new Date().toISOString().slice(0, 10),
      });
      log('info', 'playback housekeeping complete', { deleted });
      return;
    }
    case 'charts.aggregate': {
      await rpc('recompute_unique_listeners', {
        p_date: job.payload?.date || new Date().toISOString().slice(0, 10),
      });
      return;
    }
    default:
      throw new Error(`Unsupported job type: ${job.type}`);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmail(row) {
  const isArabic = row.locale === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const footer = isArabic
    ? 'تلقيت هذا البريد لأنك فعّلت تنبيهات البريد الإلكتروني في إعدادات حسابك.'
    : 'You received this email because you enabled email notifications in your account settings.';
  const manage = isArabic ? 'إدارة التنبيهات' : 'Manage notification settings';
  const body = escapeHtml(row.body_text).replace(/\n/g, '<br />');
  return {
    subject: row.subject,
    text: `${row.body_text}\n\n${footer}\n${SITE_URL}/${row.locale}/settings`,
    html: `<!doctype html><html lang="${row.locale}" dir="${dir}"><body style="margin:0;background:#090912;color:#f4f4f6;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#14141d;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9d5cff">Project AI Music</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(row.subject)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#c9c9d4">${body}</p>
        <a href="${SITE_URL}/${row.locale}/notifications" style="display:inline-block;background:#9d5cff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:14px">${manage}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#7c7c8a">${escapeHtml(footer)}<br /><a href="${SITE_URL}/${row.locale}/settings" style="color:#41d9ff">${manage}</a></p>
      </div>
    </body></html>`,
  };
}

async function sendEmail(row) {
  const rendered = renderEmail(row);
  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [row.to_email],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    }),
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`email provider ${response.status}: ${text.slice(0, 500)}`);
  let providerId = '';
  try {
    const parsed = JSON.parse(text);
    providerId = String(parsed.id || parsed.message_id || '');
  } catch {
    // Provider may return an empty body on success.
  }
  return providerId;
}

async function runEmailOnce() {
  if (!EMAIL_ENABLED) return { emails: 0 };
  const emails = (await rpc('claim_emails', { p_limit: EMAIL_BATCH })) || [];
  for (const email of emails) {
    try {
      const providerId = await sendEmail(email);
      await rpc('complete_email', { p_id: email.id, p_provider_message_id: providerId });
      log('info', 'email delivered', { emailId: email.id, userId: email.user_id });
    } catch (error) {
      const message = String(error?.message || error);
      log('error', 'email delivery failed', { emailId: email.id, error: message });
      await rpc('fail_email', { p_id: email.id, p_error: message });
    }
  }
  return { emails: emails.length };
}

async function runProductionOnce() {
  const jobs = (await rpc('claim_jobs', { p_limit: BATCH })) || [];
  for (const job of jobs) {
    try {
      await handleJob(job);
      await rpc('complete_job', { p_job: job.id });
    } catch (error) {
      const message = String(error?.message || error);
      log('error', 'job failed', { jobId: job.id, type: job.type, error: message });
      await rpc('fail_job', { p_job: job.id, p_error: message });
    }
  }
  const emailResult = await runEmailOnce();
  return { jobs: jobs.length, emails: emailResult.emails };
}

/* -------------------------------------------------------------------------- */

async function main() {
  log('info', 'media worker starting', {
    once: RUN_ONCE,
    intervalMs: INTERVAL,
    repo: REPO_ROOT,
  });
  for (const binary of ['ffmpeg', 'ffprobe']) {
    try {
      await execFileAsync(binary, ['-version'], { timeout: 10_000 });
    } catch {
      throw new Error(`${binary} is required but was not found on PATH`);
    }
  }

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  do {
    try {
      if (demoMode) await runDemoOnce();
      else await runProductionOnce();
    } catch (error) {
      log('error', 'worker cycle failed', { error: String(error?.stack || error) });
      if (RUN_ONCE) process.exitCode = 1;
    }
    if (RUN_ONCE || stopping) break;
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, INTERVAL);
      timer.unref?.();
    });
  } while (!stopping);

  log('info', 'media worker stopped');
}

main().catch((error) => {
  log('error', 'worker crashed', { error: String(error?.stack || error) });
  process.exit(1);
});
