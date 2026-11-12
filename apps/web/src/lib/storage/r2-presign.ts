import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function presignR2Put(objectKey: string, contentType: string) {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'R2 credentials are missing.', 503);
  }
  if (!/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(objectKey)) {
    throw new AppError('invalid_object_key', 'Invalid upload key.', 422);
  }
  const bucket = 'ai-music-originals';
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const path = `/${bucket}/${objectKey}`;
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': '300',
    'X-Amz-SignedHeaders': 'content-type;host',
  };
  const query = Object.entries(queryParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalRequest = [
    'PUT',
    path,
    query,
    `content-type:${contentType}\nhost:${host}\n`,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    scope,
    sha256(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, shortDate), 'auto'), 's3'),
    'aws4_request',
  );
  const signature = hmac(signingKey, stringToSign).toString('hex');
  return {
    bucket,
    url: `https://${host}${path}?${query}&X-Amz-Signature=${signature}`,
  };
}

/** Short-lived private rendition URL; never expose storage credentials. */
export function presignR2Get(objectKey: string) {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'R2 credentials are missing.', 503);
  }
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(objectKey) || objectKey.includes('..')) {
    throw new AppError('invalid_object_key', 'Invalid audio object key.', 422);
  }
  const bucket = 'ai-music-streaming';
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const path = `/${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': '120',
    'X-Amz-SignedHeaders': 'host',
  };
  const query = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = ['GET', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, shortDate), 'auto'), 's3'), 'aws4_request');
  return `https://${host}${path}?${query}&X-Amz-Signature=${hmac(signingKey, stringToSign).toString('hex')}`;
}

/** Short-lived private rendition URL; never expose storage credentials. */
export function presignR2Head(objectKey: string) {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'R2 credentials are missing.', 503);
  }
  if (!/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(objectKey)) {
    throw new AppError('invalid_object_key', 'Invalid audio object key.', 422);
  }
  const bucket = 'ai-music-originals';
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const path = `/${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': '120',
    'X-Amz-SignedHeaders': 'host',
  };
  const query = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = ['HEAD', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, shortDate), 'auto'), 's3'), 'aws4_request');
  return `https://${host}${path}?${query}&X-Amz-Signature=${hmac(signingKey, stringToSign).toString('hex')}`;
}

export function presignR2StreamingPut(objectKey: string) {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'R2 credentials are missing.', 503);
  }
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(objectKey) || objectKey.includes('..')) {
    throw new AppError('invalid_object_key', 'Invalid audio object key.', 422);
  }
  const bucket = 'ai-music-streaming';
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const path = `/${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': '300',
    'X-Amz-SignedHeaders': 'host',
  };
  const query = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = ['PUT', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, shortDate), 'auto'), 's3'), 'aws4_request');
  return `https://${host}${path}?${query}&X-Amz-Signature=${hmac(signingKey, stringToSign).toString('hex')}`;
}


export function presignR2OriginalGet(objectKey: string) {
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'R2 credentials are missing.', 503);
  }
  if (!/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(objectKey)) {
    throw new AppError('invalid_object_key', 'Invalid audio object key.', 422);
  }
  const bucket = 'ai-music-originals';
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const path = `/${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': '120',
    'X-Amz-SignedHeaders': 'host',
  };
  const query = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = ['GET', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, shortDate), 'auto'), 's3'), 'aws4_request');
  return `https://${host}${path}?${query}&X-Amz-Signature=${hmac(signingKey, stringToSign).toString('hex')}`;
}

