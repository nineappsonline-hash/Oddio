import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Artwork } from './Artwork';

describe('catalog artwork loading', () => {
  it('does not eagerly request every cover as a CSS background', () => {
    const html = renderToStaticMarkup(
      createElement(Artwork, {
        title: 'Test album',
        url: 'https://example.com/artwork.webp',
        className: 'h-32 w-32',
      }),
    );
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('src="https://example.com/artwork.webp"');
    expect(html).not.toContain('url(https://example.com/artwork.webp)');
    expect(html).toContain('aria-label="Test album"');
  });

  it('retains the decorative fallback and accessible title when art is missing', () => {
    const html = renderToStaticMarkup(createElement(Artwork, { title: 'Missing cover' }));
    expect(html).toContain('aria-label="Missing cover"');
    expect(html).not.toContain('<img');
    expect(html).toContain('<svg');
  });
});
