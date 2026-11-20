/** Builds public share links without copying auth or invite tokens from the URL.
 * Only same-origin destinations are permitted for Oddio's built-in share menu.
 */
const sensitiveParams = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'code',
  'invite',
  'invite_code',
  'secret',
  'key',
  'session',
  'state',
  'authorization',
  'auth',
  'email',
  'password',
]);

export function canonicalOddioShareUrl(
  requestedUrl: string | undefined,
  currentUrl: string,
): string {
  const current = new URL(currentUrl);
  const destination = new URL(requestedUrl || currentUrl, current.origin);
  if (
    destination.origin !== current.origin ||
    !['http:', 'https:'].includes(destination.protocol)
  )
    throw new Error('Share destination must be on Oddio');
  destination.username = '';
  destination.password = '';
  destination.hash = '';
  for (const key of Array.from(destination.searchParams.keys())) {
    if (sensitiveParams.has(key.toLowerCase())) destination.searchParams.delete(key);
  }
  if (/\/(?:tracks\/|podcasts\/(?:episodes|shows)\/)/.test(destination.pathname)) {
    // Track and show cards use a fixed share preview version; remove
    // arbitrary query parameters from the canonical content address.
    destination.search = '';
    destination.searchParams.set('preview', 'v2');
  }
  return destination.toString();
}
