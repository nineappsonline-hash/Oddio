import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_DEV_SECRET = 'project-ai-music-dev-secret';

export function demoAuthSecret(): string {
  return process.env.DEMO_AUTH_SECRET || DEFAULT_DEV_SECRET;
}

interface TokenPayload {
  uid: string;
  exp: number;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

export function signSessionToken(userId: string, ttlSeconds = 60 * 60 * 24 * 30): string {
  const payload: TokenPayload = { uid: userId, exp: Date.now() + ttlSeconds * 1000 };
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', demoAuthSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function signPlaybackToken(trackId: string, ttlSeconds = 60 * 30): string {
  const exp = Date.now() + ttlSeconds * 1000;
  const body = base64url(JSON.stringify({ tid: trackId, exp, kind: 'playback' }));
  const signature = createHmac('sha256', demoAuthSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function verifyPlaybackToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', demoAuthSecret())
    .update(body)
    .digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      tid?: string;
      exp?: number;
      kind?: string;
    };
    if (payload.kind !== 'playback' || !payload.tid || typeof payload.exp !== 'number') {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload.tid;
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', demoAuthSecret())
    .update(body)
    .digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as TokenPayload;
    if (!payload.uid || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
