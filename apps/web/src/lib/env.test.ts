import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from './env';

describe('release canonical origin', () => {
  it('preserves the configured canonical domain', () => {
    expect(resolveSiteUrl('https://oddio.example/', 'branch.vercel.app')).toBe(
      'https://oddio.example',
    );
  });
  it('uses the production domain instead of a preview/localhost host', () => {
    expect(resolveSiteUrl(undefined, 'oddio.vercel.app')).toBe(
      'https://oddio.vercel.app',
    );
  });
  it('rejects malformed or untrusted production host strings', () => {
    expect(resolveSiteUrl(undefined, 'bad.example/path')).toBe('http://localhost:3000');
    expect(resolveSiteUrl(undefined, 'evil.example:1234')).toBe('http://localhost:3000');
  });
  it('keeps local development working when no deployment URL exists', () => {
    expect(resolveSiteUrl(undefined, undefined)).toBe('http://localhost:3000');
  });
});
