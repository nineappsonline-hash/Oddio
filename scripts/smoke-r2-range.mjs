#!/usr/bin/env node
/**
 * Manually verify a NON-PRODUCTION signed R2 URL without exposing the URL.
 *
 * ODDIO_R2_TEST_URL=<short-lived signed URL> node scripts/smoke-r2-range.mjs
 * Do not put credentials or URLs in source control, CI logs or PR comments.
 * This script sends small GET Range requests directly to R2, never Vercel.
 */
import assert from 'node:assert/strict';

const signedUrl = process.env.ODDIO_R2_TEST_URL;
if (!signedUrl) {
  process.stderr.write('Set ODDIO_R2_TEST_URL to a temporary URL for a non-production R2 audio object.\n');
  process.exit(2);
}

let url;
try {
  url = new URL(signedUrl);
  assert.equal(url.protocol, 'https:');
  assert.match(url.hostname, /^[a-z0-9-]+\.r2\.cloudflarestorage\.com$/i);
  assert.ok(url.searchParams.has('X-Amz-Signature'));
} catch {
  process.stderr.write('Refusing to test: expected a signed HTTPS R2 S3 API URL.\n');
  process.exit(2);
}

async function readRange(range, expectedStart, expectedEnd) {
  // Abort after 10 seconds; cap downloads by validating status before reading.
  const response = await fetch(url, {
    method: 'GET',
    headers: { Range: range },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (response.status !== 206) {
    await response.body?.cancel();
    throw new Error(`Expected 206 for ${range}, received ${response.status}`);
  }
  const contentRange = response.headers.get('content-range');
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange ?? '');
  if (!match) throw new Error('R2 did not provide an RFC-compliant Content-Range');
  const [, start, end, total] = match;
  if (Number(start) !== expectedStart || Number(end) !== expectedEnd) {
    throw new Error(`Unexpected Content-Range offsets for ${range}`);
  }
  if (Number(total) < 32) throw new Error('Test audio must be at least 32 bytes');
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength !== expectedEnd - expectedStart + 1) {
    throw new Error(`Unexpected byte count for ${range}`);
  }
  return { body, total: Number(total) };
}

try {
  const first = await readRange('bytes=0-15', 0, 15);
  const next = await readRange('bytes=16-31', 16, 31);
  assert.equal(first.total, next.total);
  process.stdout.write(
    'R2 signed GET Range smoke passed: 206, Content-Range and 16-byte slices. No audio content or URLs logged.\n',
  );
} catch (error) {
  // Never serialize the fetch Request or URL: it contains bearer credentials.
  process.stderr.write(
    `R2 Range smoke failed: ${error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[redacted-url]') : 'network error'}\n`,
  );
  process.exitCode = 1;
}
