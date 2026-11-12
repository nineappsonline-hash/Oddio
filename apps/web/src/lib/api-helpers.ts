import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { SessionUser, StaffRole } from '@ai-music/contracts';
import { AppError, Errors } from '@/lib/errors';
import { getSessionUser } from '@/lib/auth/session';
import { demoAuthSecret } from '@/lib/auth/token';

interface RateBucket {
  count: number;
  resetAt: number;
}

const globalForRate = globalThis as unknown as {
  __aiMusicRate?: Map<string, RateBucket>;
};
const buckets = (globalForRate.__aiMusicRate ??= new Map());

export function requestId(): string {
  return crypto.randomUUID();
}

export function jsonOk<T>(
  data: T,
  requestIdValue = requestId(),
  status = 200,
): NextResponse {
  return NextResponse.json(
    { data, error: null, requestId: requestIdValue },
    { status, headers: { 'x-request-id': requestIdValue } },
  );
}

export function jsonError(error: unknown, requestIdValue = requestId()): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        data: null,
        error: { code: error.code, message: error.message },
        requestId: requestIdValue,
      },
      { status: error.status, headers: { 'x-request-id': requestIdValue } },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'invalid_input',
          message: error.issues.map((issue) => issue.message).join('; '),
        },
        requestId: requestIdValue,
      },
      { status: 422, headers: { 'x-request-id': requestIdValue } },
    );
  }
  console.error('[api] unhandled error', error);
  return NextResponse.json(
    {
      data: null,
      error: { code: 'server_error', message: 'Server error. Please try again.' },
      requestId: requestIdValue,
    },
    { status: 500, headers: { 'x-request-id': requestIdValue } },
  );
}

export async function parseBody<T extends ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw Errors.invalid('Request body must be valid JSON');
  }
  return schema.parse(raw);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw Errors.unauthorized();
  return user;
}

export async function requireRole(roles: StaffRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.roles.some((role) => roles.includes(role))) throw Errors.forbidden();
  return user;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

export function rateLimit(key: string, limit: number, windowMs: number): void {
  if (!checkRateLimit(key, limit, windowMs).allowed) throw Errors.rateLimited();
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'local';
}

export function anonymousHash(request: Request): string {
  const ip = clientIp(request);
  const ua = request.headers.get('user-agent') ?? 'unknown';
  return crypto
    .createHmac('sha256', demoAuthSecret())
    .update(`${ip}:${ua}`)
    .digest('hex')
    .slice(0, 32);
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('host');
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host !== host) throw Errors.forbidden();
  } catch {
    throw Errors.forbidden();
  }
}
