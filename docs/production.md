# Production deployment guide

## 1. Read this first

The web runtime is demo-first: `apps/web/src/lib/data` reads and writes
`apps/web/.data/demo.json`. Supabase auth can be enabled, but catalog reads will
still use the JSON file until the repository adapter is implemented. Do **not**
run multiple web instances against the JSON store; it is not a production
database.

The Supabase artifacts in this repository are complete and intentionally mirror
the TypeScript access rules:

| Artifact                                      | Purpose                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `supabase/migrations/0001_initial_schema.sql` | tables, enums, constraints, indexes, buckets                  |
| `0002_functions_and_triggers.sql`             | role helpers, counters, search, scheduled publication, guards |
| `0003_rls_policies.sql`                       | deny-by-default RLS and storage policies                      |
| `0004_worker_functions.sql`                   | job claim/complete/fail, session expiry, daily aggregation    |
| `0005_email_outbox.sql`                       | opt-in email outbox, trigger, claim/complete/fail             |
| `supabase/tests/rls.sql`                      | executable RLS/authorization tests                            |
| `supabase/seed.sql`                           | baseline genres and moods                                     |

## 2. Provision Supabase

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase db lint          # requires a local stack
supabase db reset         # local only; applies migrations + seed
```

Validate the schema and RLS policies against a throwaway PostgreSQL database:

```bash
createdb aim_test
DATABASE_URL=postgresql://localhost/aim_test npm run test:db
```

`test:db` installs minimal Supabase role/schema stubs, applies every migration,
loads the seed and runs `supabase/tests/rls.sql`. CI does the same on
PostgreSQL 16. Never run the stubs against a real Supabase project.

Set the project's Auth site URL and redirect allow-list to your web origin. If
you use the OAuth button, configure the provider in the Supabase dashboard and
add `https://<web-origin>/auth/callback` as an allowed redirect.

Create the first operator:

```sql
insert into public.staff_roles (user_id, role)
select id, 'super_admin' from public.profiles where handle = 'your-handle'
on conflict do nothing;
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It belongs only in the
web server and worker environments.

## 3. Storage

Migrations create four buckets:

| Bucket             | Visibility | Contents                                                |
| ------------------ | ---------- | ------------------------------------------------------- |
| `audio-masters`    | private    | original WAV/FLAC/MP3/AIFF masters                      |
| `audio-renditions` | private    | 320 kbps MP3 playable renditions                        |
| `artwork`          | public     | cover art (uploaded under `<user-id>/...`)              |
| `avatars`          | public     | profile/artist avatars (uploaded under `<user-id>/...`) |

Audio is never publicly readable. The playback endpoint authorizes a request,
then resolves a signed URL or a streamed response. Artwork writes are restricted
by storage RLS to the caller's own folder.

The worker requires permission to read `audio-masters` and write
`audio-renditions`; the service role has this access.

## 4. Environment

Copy `.env.example` to `apps/web/.env.local` for local use, or provide the same
variables through your platform's secret manager.

Critical values:

- `NEXT_PUBLIC_SITE_URL` — canonical origin, used by SEO/OAuth/share cards.
- `DEMO_MODE=false` — required when Supabase is configured for production auth.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` — server/worker only.
- `DEMO_AUTH_SECRET` — still signs playback links in the current runtime; set a
  long random value. Rotating it invalidates outstanding playback tokens.
- `AUDIO_MIN_BITRATE_KBPS=256`, `AUDIO_TARGET_BITRATE_KBPS=320`,
  `AUDIO_MAX_DURATION_SECONDS=900`, `AUDIO_MAX_UPLOAD_BYTES=104857600`.
- `UPLOAD_DAILY_LIMIT` — default per-artist quota for a UTC day.
- `EMAIL_API_KEY` / `EMAIL_FROM` — optional worker email delivery; in-app
  notifications and the outbox work without them.

R2 variables are reserved for direct-to-bucket uploads. Until that path is
implemented, `POST /api/studio/uploads/authorize` returns `501` outside demo
mode instead of pretending to work.

## 5. Media worker

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
AUDIO_TARGET_BITRATE_KBPS=320 \
npm run worker:media
```

Run it as a singleton (systemd, Fly machine, ECS task, Kubernetes Deployment with
`replicas: 1`). `claim_jobs()` uses `FOR UPDATE SKIP LOCKED`, so multiple workers
are safe, but start with one to keep transcoding CPU predictable.

Supported job types:

| Type                  | Payload                                                                    | Action                                                                                |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `media.transcode`     | `trackId`, `sourceKey`, optional `sourceBucket`, `targetBucket`, `assetId` | download master, probe, transcode to 320 kbps MP3, upload rendition, mark asset ready |
| `publication.promote` | —                                                                          | publish scheduled tracks/albums whose `release_at` has passed                         |
| `playback.cleanup`    | optional `date`                                                            | delete sessions older than 24h, recompute unique listeners                            |
| `charts.aggregate`    | optional `date`                                                            | recompute unique listeners for a UTC date                                             |

### Email delivery

Notifications are always written in-app. When a recipient has
`notification_preferences.email_opt_in = true`, a database trigger places one
message in `email_deliveries`. The worker claims it transactionally, renders a
bilingual HTML/plain-text email and sends it through a Resend-compatible API:

```bash
EMAIL_API_URL=https://api.resend.com/emails \
EMAIL_API_KEY=<provider-key> \
EMAIL_FROM='Project AI Music <notifications@your-domain>' \
npm run worker:media
```

Delivery is retried with backoff and becomes `dead` after `max_attempts`.
Inspect failures with:

```sql
select id, to_email, attempts, last_error, next_attempt_at
from public.email_deliveries
where status in ('failed', 'dead')
order by created_at desc;
```

Leave `EMAIL_API_KEY` empty to keep email disabled while in-app notifications
continue to work. Never log message bodies, addresses or provider keys.

Enqueue a transcode job when an upload completes:

```sql
select public.enqueue_job(
  'media.transcode',
  'transcode:' || :track_id || ':' || :sha256,
  :track_id,
  jsonb_build_object(
    'trackId', :track_id,
    'sourceBucket', 'audio-masters',
    'sourceKey', :object_key
  )
);
```

Failures retry with exponential backoff up to `max_attempts`, then move to
`dead`. Inspect with:

```sql
select type, state, attempts, last_error, next_run_at
from public.jobs
where state in ('failed', 'dead')
order by updated_at desc;
```

Schedule `publication.promote` at least once per minute (pg_cron, external
scheduler, or the worker loop itself) so scheduled releases go live on time.

## 6. Web deployment

1. Build once per release: `npm ci && npm run build`.
2. Run `npm start` behind TLS; terminate HTTP/2 at the proxy.
3. Cache immutable static assets; do not cache `/api/stream/*` responses
   (`Cache-Control: private, no-store` is set by the route).
4. Allow request bodies larger than your proxy default if artists upload up to
   100 MB, or move uploads to direct-to-R2 signed PUTs.
5. Set timeouts so long uploads and transcodes are not cut off.
6. Keep `workers/media` on a separate process/container from web requests.

## 7. Release checklist

- [ ] `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] `supabase db push` applied cleanly; RLS enabled on every table
- [ ] `supabase/seed.sql` loaded (genres/moods)
- [ ] First super admin granted out-of-band
- [ ] Service role and demo auth secret stored as secrets, not in git
- [ ] Storage buckets private/public as specified
- [ ] Worker running with `ffmpeg`/`ffprobe`, job queue drained
- [ ] Signed playback works, Range returns `206`, expired tokens return `403`
- [ ] Private/unlisted tracks are absent from listings and sitemaps
- [ ] Admin actions produce audit entries and notifications
- [ ] Backup/restore tested; point-in-time recovery enabled
- [ ] Email provider configured (`EMAIL_FROM` verified with the provider)
- [ ] Opt-in email outbox drained and retry/dead-letter behavior observed
- [ ] Repository adapter for Supabase completed before horizontal scaling

## 8. Known gaps before public launch

- Web data access still uses the JSON repository; implement a Supabase/PostgREST
  adapter with the same `queries.ts`/`mutations.ts` contracts.
- Transactional email, push notifications and release-alert fan-out.
- Direct-to-R2 upload grants and multipart upload for large masters.
- Automated RLS integration tests in CI (unit tests cover the mirrored rules).
- CDN edge caching for artwork and public pages.
- Payment/payouts and licensing workflows are explicitly out of scope.
