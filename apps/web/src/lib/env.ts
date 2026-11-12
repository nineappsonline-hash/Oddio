export interface ServerEnv {
  siteUrl: string;
  demoMode: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  audioMinBitrateKbps: number;
  audioMaxDurationSeconds: number;
  audioMaxUploadBytes: number;
  audioTargetBitrateKbps: number;
  uploadDailyLimit: number;
  mediaWorkerSecret: string;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Demo mode is on whenever Supabase is not configured, unless explicitly
 * disabled. Production deployments must configure Supabase and set
 * DEMO_MODE=false so that local JSON storage is never used.
 */
export const demoMode =
  process.env.DEMO_MODE === 'true'
    ? true
    : process.env.DEMO_MODE === 'false'
      ? false
      : !supabaseConfigured;

export const env: ServerEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  demoMode,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2Bucket: process.env.R2_BUCKET ?? 'ai-music-private',
  audioMinBitrateKbps: num(process.env.AUDIO_MIN_BITRATE_KBPS, 256),
  audioMaxDurationSeconds: num(process.env.AUDIO_MAX_DURATION_SECONDS, 900),
  audioMaxUploadBytes: num(process.env.AUDIO_MAX_UPLOAD_BYTES, 100 * 1024 * 1024),
  audioTargetBitrateKbps: num(process.env.AUDIO_TARGET_BITRATE_KBPS, 320),
  uploadDailyLimit: num(process.env.UPLOAD_DAILY_LIMIT, 5),
  mediaWorkerSecret: process.env.MEDIA_WORKER_SECRET ?? '',
};

export function audioPolicy() {
  return {
    minBitrateKbps: env.audioMinBitrateKbps,
    maxDurationSeconds: env.audioMaxDurationSeconds,
    maxUploadBytes: env.audioMaxUploadBytes,
    targetBitrateKbps: env.audioTargetBitrateKbps,
  };
}
