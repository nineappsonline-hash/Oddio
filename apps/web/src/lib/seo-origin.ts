/**
 * Search URLs should always resolve to the verified public Oddio domain,
 * including when pages are visited on an additional .vercel.app alias.
 * Change SEO_CANONICAL_ORIGIN only during a deliberate domain migration.
 */
export const SEO_CANONICAL_ORIGIN =
  process.env.SEO_CANONICAL_ORIGIN || 'https://oddio.online';

export function seoAbsoluteUrl(path: string): string {
  return new URL(path, SEO_CANONICAL_ORIGIN).toString();
}
