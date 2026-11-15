import { describe, expect, it } from 'vitest';
import { canonicalR2Query } from './r2-multipart';

describe('Cloudflare R2 signature v4 canonical parameters', () => {
  it('sorts by encoded ASCII bytes, not locale-sensitive collation', () => {
    const query = canonicalR2Query({
      uploadId: 'abc+def/ghi==',
      partNumber: '2',
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    });
    expect(query).toBe(
      'X-Amz-Algorithm=AWS4-HMAC-SHA256&partNumber=2&uploadId=abc%2Bdef%2Fghi%3D%3D',
    );
  });

  it('encodes RFC3986 reserved characters before signing', () => {
    expect(canonicalR2Query({ 'a!': 'a b', 'a-': 'x/y' })).toBe(
      'a%21=a%20b&a-=x%2Fy',
    );
  });
});
