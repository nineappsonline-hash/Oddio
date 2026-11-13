#!/usr/bin/env node
/**
 * Run with production-like environment variables ONLY in a protected
 * release environment. Checks presence and public URL syntax without
 * printing any credential or making a network request.
 */
import { pathToFileURL } from 'node:url';

export function auditReleaseEnvironment(env) {
  const blockers = [];
  const warnings = [];
  if (env.DEMO_MODE !== 'false') blockers.push('DEMO_MODE must be explicitly false');
  for (const key of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'CRON_SECRET',
  ]) {
    if (!env[key]?.trim()) blockers.push(`Missing required configuration: ${key}`);
  }
  // The deployed serverless cron uses CRON_SECRET; MEDIA_WORKER_SECRET is only
  // relevant if a separately deployed media worker is configured.
  if (!env.R2_BUCKET?.trim())
    warnings.push('R2_BUCKET is not explicit: validate the default bucket exists');
  const canonical =
    env.NEXT_PUBLIC_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  try {
    const parsed = new URL(canonical || '');
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) {
      blockers.push('Canonical site URL must use an HTTPS production domain');
    }
  } catch {
    blockers.push(
      'Neither a valid NEXT_PUBLIC_SITE_URL nor VERCEL_PROJECT_PRODUCTION_URL is configured',
    );
  }
  try {
    const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
    if (supabase.protocol !== 'https:')
      blockers.push('NEXT_PUBLIC_SUPABASE_URL must be HTTPS');
  } catch {
    if (env.NEXT_PUBLIC_SUPABASE_URL)
      blockers.push('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') {
    warnings.push(
      'This is not a production deployment: check the environment target before release',
    );
  }
  return { blockers, warnings, ready: blockers.length === 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = auditReleaseEnvironment(process.env);
  for (const issue of result.blockers) process.stderr.write(`BLOCKER: ${issue}\n`);
  for (const warning of result.warnings) process.stdout.write(`WARNING: ${warning}\n`);
  process.stdout.write(`Release config: ${result.ready ? 'PASS' : 'BLOCKED'}\n`);
  if (!result.ready) process.exitCode = 1;
}
