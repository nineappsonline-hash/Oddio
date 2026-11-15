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
    expect(streamRoute).toContain('presignR2Get(track.audio.objectKey)');
    expect(streamRoute).toContain(
      "response.headers.set('Cache-Control', 'private, no-store')",
    );
    expect(streamRoute).toContain(
      "response.headers.set('Referrer-Policy', 'no-referrer')",
    );
    expect(streamRoute).not.toContain('await fetch(presignR2Get(');
  });
});
