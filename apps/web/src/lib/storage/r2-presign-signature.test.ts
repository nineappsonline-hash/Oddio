import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    r2AccountId: 'oddio-test-account',
    r2AccessKeyId: 'TESTKEY123',
    r2SecretAccessKey: 'not-a-real-secret',
  },
}));

import {
  presignR2Get,
  presignR2Head,
  presignR2OriginalGet,
  presignR2Put,
} from './r2-presign';

const KEY = 'not-a-real-secret';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function validateSig(raw: string, method: string, contentType?: string): URL {
  const url = new URL(raw);
  expect(url.protocol).toBe('https:');
  expect(url.hostname).toBe('oddio-test-account.r2.cloudflarestorage.com');

  const supplied = url.searchParams.get('X-Amz-Signature');
  expect(supplied).toMatch(/^[0-9a-f]{64}$/);
  const timestamp = url.searchParams.get('X-Amz-Date') ?? '';
  expect(timestamp).toMatch(/^\d{8}T\d{6}Z$/);
  const scope = `${timestamp.slice(0, 8)}/auto/s3/aws4_request`;
  expect(url.searchParams.get('X-Amz-Credential')).toBe(`TESTKEY123/${scope}`);
  const signedHeaders = contentType ? 'content-type;host' : 'host';
  expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe(signedHeaders);

  const params = Array.from(url.searchParams.entries())
    .filter(([key]) => key !== 'X-Amz-Signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const headers = contentType
    ? `content-type:${contentType}\nhost:${url.host}\n`
    : `host:${url.host}\n`;
  const canonical = [
    method,
    url.pathname,
    params,
    headers,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonical)].join('\n');
  const short = timestamp.slice(0, 8);
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${KEY}`, short), 'auto'), 's3'),
    'aws4_request',
  );
  const expected = hmac(signingKey, toSign).toString('hex');
  expect(supplied).toBe(expected);
  return url;
}

describe('Cloudflare R2 S3 signed request contracts', () => {
  const objectKey =
    'incoming/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001';

  it('signs browser direct MP3 upload with required Content-Type', () => {
    const grant = presignR2Put(objectKey, 'audio/mpeg');
    expect(grant.bucket).toBe('ai-music-originals');
    const url = validateSig(grant.url, 'PUT', 'audio/mpeg');
    expect(url.pathname).toBe(`/ai-music-originals/${objectKey}`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
  });

  it('signs original object HEAD checks without requiring browser credentials', () => {
    const url = validateSig(presignR2Head(objectKey), 'HEAD');
    expect(url.pathname).toBe(`/ai-music-originals/${objectKey}`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('120');
  });

  it('signs 30-minute GET for original MP3 fallback and transcoded renditions', () => {
    const fallback = validateSig(presignR2OriginalGet(objectKey), 'GET');
    expect(fallback.pathname).toBe(`/ai-music-originals/${objectKey}`);
    expect(fallback.searchParams.get('X-Amz-Expires')).toBe('1800');
    const rendition = validateSig(presignR2Get('renditions/example.mp3'), 'GET');
    expect(rendition.pathname).toBe('/ai-music-streaming/renditions/example.mp3');
    expect(rendition.searchParams.get('X-Amz-Expires')).toBe('1800');
    // The Range header is not part of the signature; browsers may seek using
    // subsequent byte-range requests to the same short-lived GET URL.
    expect(rendition.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
  });

  it('rejects invalid streaming object keys before generating any signature', () => {
    expect(() => presignR2Get('../private.mp3')).toThrow();
    expect(() => presignR2Head('../private.mp3')).toThrow();
    expect(() => presignR2OriginalGet('other/track.mp3')).toThrow();
  });
});
