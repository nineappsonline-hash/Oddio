import { describe, expect, it } from 'vitest';
import { isPodcastWriteOriginAllowed } from './request-origin';

describe('podcast publishing request origin', () => {
  const url = 'http://localhost:3253/api/podcasts/manage';

  it('accepts the browser origin when Next normalized the internal hostname', () => {
    expect(
      isPodcastWriteOriginAllowed(
        new Request(url, {
          headers: { host: '127.0.0.1:3253', origin: 'http://127.0.0.1:3253' },
        }),
      ),
    ).toBe(true);
  });

  it('rejects other origins, schemes, and invalid origins', () => {
    for (const origin of [
      'http://elsewhere.invalid',
      'https://127.0.0.1:3253',
      'null',
      'not a URL',
    ]) {
      expect(
        isPodcastWriteOriginAllowed(
          new Request(url, {
            headers: { host: '127.0.0.1:3253', origin },
          }),
        ),
      ).toBe(false);
    }
  });

  it('uses the URL authority for server requests without a Host header', () => {
    expect(
      isPodcastWriteOriginAllowed(
        new Request(url, { headers: { origin: 'http://localhost:3253' } }),
      ),
    ).toBe(true);
  });
});
