import { describe, expect, it } from 'vitest';
import { canonicalOddioShareUrl } from './share-url';

describe('public Oddio sharing links', () => {
  const base = 'https://oddio.online/ar/discover';
  it('keeps a canonical song link and drops arbitrary query or fragments', () => {
    expect(
      canonicalOddioShareUrl(
        '/ar/tracks/track-1?token=secret&campaign=test#lyrics',
        base,
      ),
    ).toBe('https://oddio.online/ar/tracks/track-1?preview=v2');
  });

  it('never copies invitation codes or session credentials', () => {
    const link = canonicalOddioShareUrl(
      '/ar/playlists/playlist?invite_code=abcdef&state=other&utm_source=shared#editor',
      base,
    );
    expect(link).toContain('utm_source=shared');
    expect(link).not.toContain('invite_code');
    expect(link).not.toContain('state');
    expect(link).not.toContain('#editor');
  });

  it('rejects cross-origin destinations instead of sharing attacker-controlled links', () => {
    expect(() => canonicalOddioShareUrl('https://evil.example/phish', base)).toThrow();
    expect(() => canonicalOddioShareUrl('//evil.example/phish', base)).toThrow();
    expect(() => canonicalOddioShareUrl('javascript:alert(1)', base)).toThrow();
  });

  it('supports the current same-origin page and canonical podcast share links', () => {
    expect(canonicalOddioShareUrl(undefined, base)).toBe(base);
    expect(canonicalOddioShareUrl('/en/podcasts/shows/show-1?secret=abc', base)).toBe(
      'https://oddio.online/en/podcasts/shows/show-1?preview=v2',
    );
  });
});
