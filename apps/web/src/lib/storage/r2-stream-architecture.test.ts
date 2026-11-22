import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const signing = readFileSync(path.join(here, 'r2-presign.ts'), 'utf8');
const streamRoute = readFileSync(
  path.join(here, '../../app/api/stream/[id]/route.ts'),
  'utf8',
);

function functionBody(name: string, until: string): string {
  const start = signing.indexOf(`export function ${name}(`);
  const end = signing.indexOf(`export function ${until}(`, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return signing.slice(start, end);
}

describe('Cloudflare R2 streaming architecture guard', () => {
  it('gives renditions 30-minute signed GET access for later Range seeks', () => {
    const body = functionBody('presignR2Get', 'presignR2Head');
    expect(body).toContain("'X-Amz-Expires': '1800'");
    expect(body).toContain("'GET'");
    expect(body).toContain("'UNSIGNED-PAYLOAD'");
  });

  it('keeps the original MP3 fallback expiry aligned with the player token', () => {
    const body = functionBody('presignR2OriginalGet', 'presignR2Delete');
    expect(body).toContain("'X-Amz-Expires': '1800'");
    expect(body).toContain("'GET'");
  });

  it('redirects audio bytes to R2 rather than proxying them through Vercel', () => {
    expect(streamRoute).toContain('NextResponse.redirect(');
    expect(streamRoute).toMatch(/presignR2Get\((?:track\.)?audio\.objectKey\)/);
    expect(streamRoute).toContain(
      "response.headers.set('Cache-Control', 'private, no-store')",
    );
    expect(streamRoute).toContain(
      "response.headers.set('Referrer-Policy', 'no-referrer')",
    );
    expect(streamRoute).not.toContain('await fetch(presignR2Get(');
  });

  it('refuses to cache any demo audio Range reply, including invalid ranges', () => {
    expect(streamRoute).toContain("'Cache-Control': 'private, max-age=0, no-store'");
    expect(streamRoute).toContain("'Referrer-Policy': 'no-referrer'");
    const invalidRanges = streamRoute.match(/status: 416/g) ?? [];
    expect(invalidRanges).toHaveLength(2);
    const cacheGuards = streamRoute.match(/'Cache-Control': 'private, no-store'/g) ?? [];
    expect(cacheGuards.length).toBeGreaterThanOrEqual(2);
  });

  it('marks playback errors private so expired tokens cannot be cached', () => {
    expect(streamRoute).toContain('const AUDIO_ERROR_HEADERS = {');
    expect(streamRoute).toContain("'Cache-Control': 'private, no-store'");
    expect(streamRoute).toContain("'Referrer-Policy': 'no-referrer'");
    const protectedErrors = streamRoute.match(/headers: AUDIO_ERROR_HEADERS/g) ?? [];
    expect(protectedErrors.length).toBeGreaterThanOrEqual(6);
  });

  it('signs delete requests with the same canonical newline and AWS timestamp format', () => {
    const body = signing.slice(signing.indexOf('export function presignR2Delete('));
    expect(body).toContain(String.raw`/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/`);
    expect(body).toContain(String.raw`replace(/[:-]|\.\d{3}/g, '')`);
    expect(body).toContain("host',");
    expect(body).toContain(String.raw`'UNSIGNED-PAYLOAD'`);
    const slash = String.fromCharCode(92);
    expect(body).toContain("].join('" + slash + "n')");
    expect(body).not.toContain("].join('" + slash + slash + "n')");
    expect(body).not.toContain(String.raw`replace(/[:-]|\\.\\d{3}/g, '')`);
    expect(body).not.toContain(String.raw`/^[a-zA-Z0-9/_-]+\\.[a-zA-Z0-9]+$/`);
  });
});
