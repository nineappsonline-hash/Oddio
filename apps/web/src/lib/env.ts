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

/**
 * Canonical links must never use localhost on a Vercel deployment just
 * because NEXT_PUBLIC_SITE_URL was not set in the project settings.
 * Prefer an explicit deployment-independent origin, then Vercel's
 * production domain (also present in preview builds).
 */
export function resolveSiteUrl(explicit: string | undefined, productionDomain: string | undefined): string {
  if (explicit?.trim()) return explicit.trim().replace(/\\/$/, '');
  if (productionDomain && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(productionDomain) && productionDomain.includes('.')) {
    return `https://${productionDomain}`;
  }
  return 'http://localhost:3000';
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
  siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL),
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
  audioMaxUploadBytes: Math.min(
    num(process.env.AUDIO_MAX_UPLOAD_BYTES, 25 * 1024 * 1024),
    25 * 1024 * 1024,
  ),
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
