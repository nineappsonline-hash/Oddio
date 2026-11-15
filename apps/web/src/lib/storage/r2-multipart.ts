import crypto from 'node:crypto';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

const BUCKET = 'ai-music-originals';
const encoded = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
const hexSha = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, value: string) =>
  crypto.createHmac('sha256', key).update(value).digest();
const validKey = (key: string) => /^incoming\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key);
const validUploadId = (value: string) =>
  value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f]/.test(value);

type Method = 'POST' | 'GET' | 'DELETE' | 'PUT';

function signature(method: Method, objectKey: string, params: Record<string, string>,
  body = '', expires = 300) {
  if (!validKey(objectKey)) throw new AppError('invalid_upload_key', 'Invalid upload key.', 422);
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new AppError('storage_not_configured', 'Cloudflare R2 is not configured.', 503);
  }
  const host = `${env.r2AccountId}.r2.cloudflarestorage.com`;
  const path = `/${BUCKET}/${objectKey.split('/').map(encoded).join('/')}`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = timestamp.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const query: Record<string, string> = { ...params };
  // The browser receives only short-lived credentials for a single PUT part.
  if (expires) {
    Object.assign(query, {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${env.r2AccessKeyId}/${scope}`,
      'X-Amz-Date': timestamp,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host',
    });
  }
  const canonicalQuery = Object.entries(query)
    .map(([key, value]) => [encoded(key), encoded(value)])
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const payload = expires ? 'UNSIGNED-PAYLOAD' : hexSha(body);
  const headers = expires
    ? `host:${host}\n`
    : `host:${host}\nx-amz-content-sha256:${payload}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = expires ? 'host' : 'host;x-amz-content-sha256;x-amz-date';
  const canonical = [method, path, canonicalQuery, headers, signedHeaders, payload].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', timestamp, scope, hexSha(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${env.r2SecretAccessKey}`, day), 'auto'), 's3'), 'aws4_request');
  const sig = hmac(key, toSign).toString('hex');
  const url = `https://${host}${path}?${canonicalQuery}`;
  return expires
    ? { url: `${url}&X-Amz-Signature=${sig}`, headers: {} as Record<string, string> }
    : {
        url,
        headers: {
          'x-amz-date': timestamp,
          'x-amz-content-sha256': payload,
          Authorization: `AWS4-HMAC-SHA256 Credential=${env.r2AccessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
        },
      };
}

async function signedS3(method: 'POST' | 'GET' | 'DELETE',
  objectKey: string, params: Record<string, string>, body = '') {
  const request = signature(method, objectKey, params, body, 0);
  const response = await fetch(request.url, {
    method,
    headers: {
      ...request.headers,
      ...(body ? { 'Content-Type': 'application/xml' } : {}),
    },
    ...(body ? { body } : {}),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new AppError('multipart_storage_error',
      `Cloudflare R2 multipart request failed (HTTP ${response.status}).`, 502);
  }
  return response.text();
}

function xmlValue(xml: string, tag: string): string | null {
  const found = xml.match(new RegExp(`<(?:[a-z0-9]+:)?${tag}>([^<]+)</(?:[a-z0-9]+:)?${tag}>`, 'i'));
  return found?.[1] ?? null;
}

export async function beginMultipart(objectKey: string): Promise<string> {
  const xml = await signedS3('POST', objectKey, { uploads: '' });
  const uploadId = xmlValue(xml, 'UploadId');
  if (!uploadId || !validUploadId(uploadId)) {
    throw new AppError('multipart_response_invalid', 'R2 did not provide an upload ID.', 502);
  }
  return uploadId;
}

export function presignMultipartPart(objectKey: string, uploadId: string, partNumber: number) {
  if (!validUploadId(uploadId) || !Number.isInteger(partNumber) ||
      partNumber < 1 || partNumber > 10000) {
    throw new AppError('multipart_part_invalid', 'Invalid multipart upload part.', 422);
  }
  return signature('PUT', objectKey, { partNumber: String(partNumber), uploadId }, '', 300).url;
}

export interface UploadedPart { partNumber: number; etag: string; size: number }

export async function listMultipartParts(objectKey: string, uploadId: string): Promise<UploadedPart[]> {
  if (!validUploadId(uploadId)) throw new AppError('multipart_id_invalid', 'Invalid upload ID.', 422);
  const xml = await signedS3('GET', objectKey, { uploadId });
  const parts: UploadedPart[] = [];
  for (const match of xml.matchAll(/<Part>([\s\S]*?)<\/Part>/gi)) {
    const number = Number(xmlValue(match[1], 'PartNumber'));
    const size = Number(xmlValue(match[1], 'Size'));
    const etag = xmlValue(match[1], 'ETag');
    if (Number.isInteger(number) && number > 0 && Number.isSafeInteger(size) &&
        size > 0 && etag && /^"?[a-f0-9]{32}"?$/i.test(etag)) {
      parts.push({ partNumber: number, size, etag: etag.replace(/"/g, '') });
    }
  }
  return parts;
}

export async function finishMultipart(objectKey: string, uploadId: string,
  parts: UploadedPart[]): Promise<void> {
  if (!validUploadId(uploadId) || !parts.length || parts.length > 10000 ||
      parts.some((part, index) => part.partNumber !== index + 1 ||
        !/^"?[a-f0-9]{32}"?$/i.test(part.etag))) {
    throw new AppError('multipart_parts_invalid', 'Missing or invalid upload parts.', 422);
  }
  const xml = '<CompleteMultipartUpload>' + parts.map((part) =>
    `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>"${part.etag.replace(/"/g, '')}"</ETag></Part>`,
  ).join('') + '</CompleteMultipartUpload>';
  const output = await signedS3('POST', objectKey, { uploadId }, xml);
  // S3 may report an XML error with HTTP 200 after accepting Complete request.
  if (/<(?:[a-z0-9]+:)?Error[>\s]/i.test(output) ||
      !/<(?:[a-z0-9]+:)?CompleteMultipartUploadResult[>\s]/i.test(output)) {
    throw new AppError('multipart_completion_failed', 'R2 did not confirm the completed object.', 502);
  }
}

export async function abortMultipart(objectKey: string, uploadId: string) {
  if (!validUploadId(uploadId)) throw new AppError('multipart_id_invalid', 'Invalid upload ID.', 422);
  await signedS3('DELETE', objectKey, { uploadId });
}
