/** Next can normalize request.url's hostname internally. Prefer the actual
 * HTTP request authority while retaining the connection's scheme check. */
export function isPodcastWriteOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const incoming = new URL(origin);
    const target = new URL(request.url);
    const authority = request.headers.get('host') ?? target.host;
    return (
      incoming.origin === origin &&
      incoming.protocol === target.protocol &&
      incoming.host === authority
    );
  } catch {
    return false;
  }
}
