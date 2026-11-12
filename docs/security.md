# Security notes

## Authentication

- **Demo mode** uses HMAC-signed session tokens (`DEMO_AUTH_SECRET`) in an
  `HttpOnly`, `SameSite=Lax` cookie. Set a long random secret; the built-in
  development fallback is public and must never be used outside local work.
- **Supabase mode** (`DEMO_MODE=false` plus Supabase keys) uses Supabase Auth with
  server-side cookie handling from `@supabase/ssr`. OAuth redirects are handled by
  `/auth/callback`.
- Playback URLs are independently signed, scoped to a single track and expire
  after 30 minutes. The stream route re-checks track access on every request, so
  a valid token for a private/scheduled track does not bypass ownership rules.

## Authorization

- Every API handler re-authenticates and re-authorizes. UI hiding is never the
  only control.
- Staff roles live in a separate table (`staff_roles`); there is no
  self-service path to grant them in RLS.
- Reviewers cannot approve their own artist application or verification request
  (database checks plus API checks).
- Track ownership is derived from `artists.owner_user_id`, never from a client
  supplied artist or user id.
- Supabase RLS is deny-by-default. Playback tables and jobs have no client
  policies at all; only the service role can touch them.

## CSRF, CORS and abuse

- Mutating API routes call `assertSameOrigin`: any supplied `Origin` must match
  the request `Host`. Cookies are `SameSite=Lax`, so cross-site form posts do not
  carry credentials.
- No permissive CORS headers are emitted. Add explicit allow-lists only if a
  native/mobile client needs them.
- Uploads, login, reports, playback authorization and comments are rate-limited.
  The current limiter is in-process and per-instance; for horizontal scaling,
  move counters to Redis/Upstash and keep the same keys.
- Anonymous playback sessions are hashed from IP + user agent, never stored raw.
- Qualified play telemetry is deduplicated per session+track inside a
  transaction, and the database enforces a partial unique index so replays
  cannot inflate charts.

## Uploads

- Audio is validated with `ffprobe` (format, duration, bitrate, channels, size)
  before acceptance, then normalized to a 320 kbps MP3 rendition when required.
- Lossless masters are stored privately and served only through authorized
  playback; there is no public bucket or direct object URL.
- Artwork is limited to 5 MB and PNG/JPEG/WEBP/GIF. Filenames are generated
  server-side; user-supplied paths are never trusted.
- Content-type and extension are both checked; SVG is not accepted (avoids
  script-bearing images).
- Production should add malware scanning and an image re-encode step before
  making artwork public.

## Data protection

- Public profile fields exclude email and password material. `profiles` has no
  credential columns; auth secrets remain in Supabase Auth.
- Service role keys are server-only. Never prefix them with `NEXT_PUBLIC_`.
- `audio_assets.object_key` is readable only by owners and staff; clients receive
  signed stream URLs instead.
- Audit logs are append-only from the client's perspective and readable only by
  staff.
- Email delivery rows are service-role only. They contain recipient addresses and
  notification text, so treat the table and worker logs as personal data and
  apply the retention policy of your email provider.
- Logs should contain request ids and stable error codes, not passwords, tokens
  or full upload payloads.

## Transport and headers

- `X-Content-Type-Options: nosniff` and a strict referrer policy are set for API
  routes. `nosniff` is also set on streamed audio.
- Terminate TLS at the proxy and redirect HTTP to HTTPS.
- Recommended additions before launch: HSTS, a strict Content-Security-Policy,
  `Permissions-Policy`, and frame-ancestors restrictions. The app does not iframe
  third-party content, so a CSP with `default-src 'self'` plus image/font/media
  origins is feasible once all asset hosts are known.
- Keep `Cache-Control: private, no-store` on authorized audio responses so shared
  caches cannot leak private tracks.

## Incident checklist

1. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_AUTH_SECRET`; redeploy web and
   worker.
2. Revoke affected sessions in Supabase Auth or clear `aim_session` cookies.
3. Suspend the account (`profiles`/staff role removal) and unpublish or hide
   reported tracks/comments.
4. Preserve `audit_logs`, `reports` and server request ids.
5. Re-run the release checklist in `docs/production.md` before restoring traffic.
