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

The application currently runs its **data layer against the local JSON store**
in all modes. `supabase/` contains the complete target schema, triggers, RLS
policies, storage buckets, transactional job/email outboxes, and an executable
RLS test suite; `workers/media` operates against that schema — but wiring the web
repositories (`apps/web/src/lib/data`) to Supabase/PostgREST is the remaining
step before a multi-instance production deployment. See
[`docs/production.md`](docs/production.md) for the migration checklist and
[`docs/security.md`](docs/security.md) for the threat model.

## License

Proprietary — all rights reserved.
