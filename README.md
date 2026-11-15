# Project AI Music

An AI-music-only streaming and publishing platform: bilingual English/Arabic UI
with RTL support, a real streaming player, an artist Studio with human review,
and an administration console.

This repository is a runnable Next.js 15 monorepo. It ships with a fully seeded
**demo mode** (local JSON store + generated audio) and a production-grade
**Supabase schema, RLS policy set and media worker** under `supabase/` and
`workers/`.

## Quick start

Requirements: Node.js >= 20.9, npm >= 10, and `ffmpeg`/`ffprobe` on `PATH`
(used for audio probing/transcoding and to generate demo audio).

```bash
cp .env.example apps/web/.env.local
npm install
npm run setup:demo      # generates six 90s sample masters with ffmpeg
npm run dev             # http://localhost:3000 -> redirects to /en
```

Production-like local run:

```bash
npm run build
npm start -- -p 3100
```

### Demo accounts

Password for every account: `demo1234`.

| Email                 | Role                           |
| --------------------- | ------------------------------ |
| `listener@demo.local` | Listener (owns playlists)      |
| `artist@demo.local`   | Artist manager (Nova Khepri)   |
| `artist2@demo.local`  | Artist manager (Layla Mansour) |
| `admin@demo.local`    | Super admin                    |
| `mod@demo.local`      | Moderator                      |

The login screen can fill these credentials with one click.

## Scripts

| Command                       | Purpose                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`                 | Next.js dev server                                                            |
| `npm run build` / `npm start` | Production build / server                                                     |
| `npm run lint`                | ESLint (Next.js config)                                                       |
| `npm run typecheck`           | TypeScript project check                                                      |
| `npm test`                    | Vitest unit tests (audio policy, access, quota, charts, slugs)                |
| `npm run test:db`             | Apply migrations + seed + executable RLS tests to a fresh PostgreSQL database |
| `npm run setup:demo`          | Regenerate demo audio (`--force` to overwrite)                                |
| `npm run worker:media`        | Media/scheduled-release worker (`-- --once` for one cycle)                    |
| `npm run format`              | Prettier                                                                      |

## What is implemented

### Public experience

- Locale routing (`/en`, `/ar`) with cookie/Accept-Language detection, `dir="rtl"`,
  Arabic-first typography (Cairo) and English secondary (Inter).
- Home modules, Discover, Search with filters, Charts (daily/weekly/monthly),
  genre and mood pages, artist/album/track/playlist pages.
- Persistent player with queue, shuffle/repeat, seek, full-screen view, keyboard
  support and authorized Range streaming (`206 Partial Content`).
- Likes, comments, follows, playlist creation/editing/following, reports,
  share links, and social preview images via `/api/og`.
- One in-app release notification per follower per public release, respecting
  release-alert preferences; opted-in recipients are queued for email delivery.
- SEO: canonical URLs, `hreflang` alternates, Open Graph, JSON-LD, sitemap and
  robots rules that exclude private/unlisted material.

### Artist Studio

- Artist application and re-submission flow with rights declaration.
- Artist profile(s), social links, albums, upload with quality policy,
  draft → submit → human review → approve/reject/changes.
- Scheduled releases, private/unlisted visibility, verification requests,
  quota-aware uploads and analytics.

### Administration

- Track review queue with reasons and immutable audit trail.
- Artist applications, reports, comment moderation, user role and quota
  management, verification decisions (no self-approval), featured slots and
  audit log viewer.
- All privileged actions are re-authorized server-side and audited.

### Audio policy

- Accepted: WAV/FLAC/MP3/AIFF, minimum 256 kbps, maximum 15 minutes and 100 MB.
- Lossless masters are served byte-for-byte and labelled `lossless`; lossy
  sources are transcoded to 320 kbps MP3 and labelled honestly (`high` or
  `standard`). Uploads below the minimum are rejected; nothing is upsampled and
  advertised as higher fidelity.
- Playback links are HMAC-signed, short-lived and scoped to one track. The
  stream endpoint enforces visibility/review state and supports byte ranges.
- A qualified play requires 30 seconds of audible playback (or the full track,
  if shorter), deduplicated per session+track.

## Repository layout

```
apps/web                 Next.js App Router application
  src/app                routes (locale-scoped pages + API route handlers)
  src/components         layout, player, music, community, studio, admin, UI
  src/i18n               dictionaries + server/client translators
  src/lib                data store, auth, audio, SEO, API helpers
packages/contracts       zod inputs, shared types, enums
packages/db              pure authorization/quota/chart/slug logic
packages/audio           audio quality policy
workers/media            transcoding, publication, email delivery and housekeeping worker
supabase/migrations      schema, triggers, RLS, queue helpers, email outbox
supabase/tests           executable RLS/authorization test suite
supabase/seed.sql        baseline genres and moods
scripts/setup-demo.mjs   demo audio generator
```

## Data and authorization

- `packages/db/src/visibility.ts` is the single access gate used by pages and
  API handlers; its rules mirror the SQL policies in `supabase/migrations`.
- Track owner identity is always resolved from the artist record, never from
  client input. Staff actions are checked again inside each API handler.
- Demo state lives in `apps/web/.data/demo.json` (gitignored). Deletes preserve
  audit history in the seeded model.

## Production notes

**Oddio has distinct demo and production data paths.** With `DEMO_MODE=true`,
the Next.js app uses a local JSON database and local generated audio files.
With `DEMO_MODE=false`, catalog pages use the existing Supabase adapter.
Production social and playlist routes are being migrated to durable Supabase
operations; playback sessions and events are now routed through the production
adapter on the development branch. The remaining API routes still require
a complete audit for ephemeral or nontransactional snapshot writes.

**Cloudflare R2 is the audio store, not Supabase Storage or Vercel.**
The production stream endpoint validates access and issues an HTTP 307 redirect
to a signed R2 GET URL. It does not proxy the audio file through Vercel.
The direct-upload authorization/finalize flow uses the `ai-music-originals`
bucket; the media worker writes renditions to `ai-music-streaming`. Audio R2
objects have not yet passed an authenticated browser end-to-end staging test.

**Do not merge the development branch to production yet.**
`supabase/migrations/20261115183000_atomic_social_interactions.sql` is
required by production social endpoints on that branch. A verified backup,
database staging acceptance, a working persistent media worker, real R2
upload/Range tests and the full CI release gates are required before rollout.
No existing production data should be overwritten by demo seed files.

See [the implementation tracker](docs/oddio-master-implementation-plan.md),
[production guide](docs/production.md) and [security notes](docs/security.md).

## License

Proprietary — all rights reserved.
