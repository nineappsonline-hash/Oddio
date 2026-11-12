# Project AI Music — Master Product & Engineering Specification

**Version:** 1.0  
**Status:** Approved product decisions + implementation recommendations  
**Product name:** Placeholder: Project AI Music  
**Primary language of this specification:** English  
**Product languages:** Arabic (RTL) and English (LTR)

> Build a global, AI-music-only listening and publishing platform, marketed initially toward Egypt and the Arab world. Launch the responsive website as quickly as possible, keep initial operating costs low, and optimize for the first 10,000 users. Android and iOS follow later. This document is the source of truth for AI coding agents. Explicitly labeled recommendations require product-owner confirmation before changing product behavior.

## 1. Product principles and locked decisions

| Area             | Requirement                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Audience         | Global; initial marketing focus Egypt and Arabic-speaking audiences                             |
| Content          | Fully AI-generated and AI-assisted music; no in-app generation                                  |
| Listening        | Anonymous visitors may play public tracks; free and ad-free at launch                           |
| Accounts         | Email/password, Google, Apple and Facebook sign-in                                              |
| Artists          | Artist access requires application and approval; one user can manage multiple artist identities |
| Artist profile   | Avatar, cover, bio, social links, featured track and customizable accent colors                 |
| Track publishing | Every new track requires human admin approval                                                   |
| Upload quota     | 5 tracks per day for new artist accounts, with admin-adjustable increases for trusted accounts  |
| Scheduling       | Artist may specify future release date/time                                                     |
| Visibility       | Public, unlisted (link-only), private                                                           |
| Playback         | Queue, continuous playback and autoplay similar music                                           |
| Lyrics           | Plain lyrics at launch; timed/synchronized lyrics later                                         |
| Offline          | No downloads at launch; in-app offline listening later                                          |
| Explicit content | Prohibited; content policy and enforcement required                                             |
| Community        | Comments, likes (no dislikes), follows, new-release notifications                               |
| Sharing          | Shareable link and generated social preview; audio snippets later                               |
| Discovery        | Genre, mood, language, country; global/country/genre charts                                     |
| Recommendations  | Trending/latest first, personalized recommendations later                                       |
| Playlists        | Public/private; users may follow public playlists                                               |
| Admin roles      | Super Admin, Admin, Moderator                                                                   |
| Featured content | Editorial picks plus automated trending selection                                               |
| Verification     | Artist-initiated request reviewed by staff                                                      |
| Audio            | Target 320 kbps MP3 streaming where source quality permits; preserve original uploads           |
| Launch           | Website first; Android/iOS later; fastest responsible launch                                    |
| Implementation   | AI coding tools; low-cost/free-tier-first stack                                                 |
| Scale            | Optimize for first 10,000 users; avoid premature distributed architecture                       |
| Monetization     | No ads or subscriptions at launch; artist royalties later                                       |

### 1.1 Non-negotiable quality rules

- Do not claim a 128 kbps source becomes high fidelity after transcoding to 320 kbps.
- Never expose original or private files via public buckets or unrestricted permanent URLs.
- Never publish pending, rejected, scheduled-before-release, or private tracks in public discovery/search/sitemaps.
- Do not count a stream on page load or a Play click alone.
- All data mutations must be authorized server-side and protected by database row-level security (RLS) where applicable.
- Every public-facing interface must support keyboard navigation, mobile layouts, Arabic RTL and English LTR.
- Treat the legal right to distribute AI-generated or AI-assisted tracks as a release blocker, not an afterthought.

## 2. Personas and permissions

**Guest:** Browse and play public tracks, search, view artist/album pages, follow shared public playlist links; prompt for login on personal actions.  
**Listener:** Guest capabilities plus likes, comments, follows, own library, playlists, playback history and notification preferences.  
**Artist applicant:** Listener who submitted an application; can check status and respond to requests for information.  
**Approved artist manager:** Create and manage multiple artist identities, upload and submit tracks, manage releases, see own analytics, apply for verification.  
**Moderator:** Review comments, reports and flagged content; hide content pending investigation; no billing/configuration access.  
**Admin:** Moderator plus review artist applications, approve/reject tracks, manage editorial features, taxonomies and verification.  
**Super Admin:** Full administration, role grants, quota configuration, audit logs and operational settings.

**Recommended ownership rule:** An approved account owns its artist profiles; allow collaborators only in a later phase. Every artist and track operation checks the requesting account's ownership. Admin roles are assigned through a trusted server-side process, never via editable user metadata.

## 3. Scope and release plan

### MVP / launch-critical

- Responsive web app, Arabic/English, accessibility and SEO for public content.
- Auth: email/password + Google + Apple + Facebook (provider approval/configuration required).
- Artist applications, admin approval, multiple artist profiles, artist customization.
- Original upload to private object storage; metadata extraction, validation, transcode when appropriate; 320 kbps target, secure playback delivery.
- Five uploads/day initial quota; all submitted tracks manually reviewed.
- Single releases and albums, scheduled releases, public/unlisted/private visibility.
- Public browse, search, genre/mood/language/country filters, featured/latest/trending, charts.
- Persistent mini-player, full player, queue, shuffle/repeat, autoplay, next/previous, volume, media-session controls.
- Likes, comments with reporting/moderation, follows and notifications for new releases.
- Public/private playlists, playlist follows, library and listening history.
- Artist analytics, admin dashboard, abuse reports, verification requests, audit logging.
- Social share cards, canonical URLs, public metadata and basic operational monitoring.

### Post-launch

- React Native/Expo Android and iOS apps; background playback and OS media controls.
- In-app encrypted offline cache with licensing/expiry controls; **not** downloadable MP3 files.
- Timed lyrics; personalized recommendations; richer analytics; audio share clips.
- Optional monetization, artist payouts, premium subscriptions and ads only after separate legal/product review.

### Explicitly out of scope for launch

- AI music generation, free downloadable track files, royalty payouts, ads, subscriptions, timed lyrics, collaborative artist management, direct messaging, live audio and user-uploaded podcasts.

## 4. Information architecture and routes

### Public website

| Route                                                                         | Purpose                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/`                                                                           | Localized home: featured hero, trending, latest, genres, artists |
| `/discover`                                                                   | Filtered discovery and curated sections                          |
| `/search?q=`                                                                  | Search tracks, artists, albums and playlists                     |
| `/charts`                                                                     | Global, country and genre rankings                               |
| `/genres/[slug]`                                                              | Genre landing page                                               |
| `/moods/[slug]`                                                               | Mood landing page                                                |
| `/artists/[slug]`                                                             | Artist profile, popular tracks, releases, follow                 |
| `/tracks/[id]-[slug]`                                                         | Track detail, play, lyrics, credits, comments, share             |
| `/albums/[id]-[slug]`                                                         | Album detail and ordered track list                              |
| `/playlists/[id]-[slug]`                                                      | Public playlist detail                                           |
| `/login`, `/signup`, `/auth/callback`                                         | Authentication                                                   |
| `/legal/terms`, `/legal/privacy`, `/legal/content-policy`, `/legal/copyright` | Legal pages                                                      |

### Authenticated listener

`/library`, `/library/likes`, `/library/playlists`, `/history`, `/notifications`, `/settings`, `/settings/privacy`, `/apply/artist`, `/apply/artist/status`, `/playlists/new`, `/playlists/[id]/edit`.

### Artist Studio

`/studio`, `/studio/artists`, `/studio/artists/new`, `/studio/artists/[id]/edit`, `/studio/tracks`, `/studio/tracks/new`, `/studio/tracks/[id]`, `/studio/albums`, `/studio/albums/new`, `/studio/analytics`, `/studio/verification`, `/studio/settings`.

### Administration

`/admin`, `/admin/artist-applications`, `/admin/tracks/review`, `/admin/reports`, `/admin/comments`, `/admin/artists`, `/admin/users`, `/admin/verification`, `/admin/featured`, `/admin/charts`, `/admin/taxonomies`, `/admin/settings`, `/admin/audit`.

**SEO:** Only public, approved, already released and indexable resources enter sitemaps. Unlisted content uses `noindex` and is excluded from listings; private content requires authorization and is never indexable. Use localized `hreflang`, canonical tags, server-rendered metadata, Open Graph images and JSON-LD `MusicRecording`, `MusicAlbum`, and `MusicGroup`/`Person` where appropriate.

## 5. User journeys and state machines

### 5.1 Guest to listener

1. Guest opens public track and presses Play without account.
2. Player starts and records an anonymous session with privacy-safe telemetry.
3. Guest attempts Like, Follow, Comment or Save; login modal preserves the pending action.
4. After auth, user returns to the same page and can complete the action.

### 5.2 Artist onboarding

1. Listener opens artist application and provides display name, description, portfolio/sample links, rights declaration and contact details.
2. State transitions `draft -> submitted -> under_review -> approved | rejected | needs_information`.
3. Admin reviews, records decision and sends notification; applicant can resubmit when permitted.
4. Approved manager creates one or more artist profiles; slug uniqueness and content validation enforced.

### 5.3 Upload, review and release

1. Artist selects identity and uploads audio plus artwork and metadata.
2. Client requests a short-lived upload authorization; audio is uploaded directly to private storage.
3. Server verifies object ownership, content type, byte size, duration, actual codec/bitrate, malware risk where applicable and file integrity.
4. Worker extracts metadata and produces playback rendition if the source permits, while preserving original.
5. Artist completes title, genre, mood, language, country, credits, lyrics, production type/tool, artwork, visibility and optional release schedule.
6. Artist confirms distribution rights, AI tool licensing and non-impersonation declaration, then submits for review.
7. State transitions `draft -> processing -> ready_for_review -> pending_review -> approved | rejected | changes_requested`.
8. If approved and release time is future: `scheduled`; otherwise `published` if public/unlisted, or `available_private` if private.
9. Editing audio or material metadata after approval returns track to review; retain last approved public version until replacement is approved, unless owner explicitly unpublishes.
10. Scheduled publication is executed by a reliable job, with an idempotent status transition and correct timezone handling (store UTC).

**Visibility rules:** Public = searchable and chart-eligible; Unlisted = playable by link but absent from search/charts/sitemaps; Private = only owner/admin preview, regardless of link knowledge. **Review always precedes any audience access**, including unlisted.

### 5.4 Comments and reports

- Signed-in listeners may comment on approved accessible tracks; comments must pass length/rate checks and profanity/spam filters.
- Users may report a track, artist or comment; report types include copyright, impersonation, prohibited explicit content, harassment, spam and other.
- Moderator may hide a comment or temporarily restrict a track; admin resolves copyright/rights cases and documents outcome.
- Owner cannot delete an audit trail; moderation events are logged.

### 5.5 Artist verification

`not_requested -> pending -> approved | rejected`. Verification is separate from permission to publish; verification does not bypass review or increase quota automatically.

## 6. Listening and discovery behavior

### 6.1 Web player

- One global audio element controlled by a central state store, persistent across client-side navigation.
- Mini-player and full-player views share state: track, position, duration, paused, queue, repeat (`off/one/all`), shuffle, volume, playback error.
- Queue actions: play now, play next, add to queue, reorder, remove, clear.
- On end, play next queue item; if queue exhausted and autoplay enabled, fetch similar eligible public tracks using genre/mood/language similarity with popularity diversification.
- Support seek and resume through HTTP byte-range requests; show buffering, failure and retry states.
- Use Media Session API for browser/OS controls where supported; mobile browser background playback is platform-dependent and not guaranteed.
- Track played state must be isolated from user profile state so anonymous listening works.

### 6.2 Search and charts

- MVP search: Postgres full-text search plus normalized title/artist/album fields; add trigram matching for typos if needed.
- Filters: genre, mood, language, country, newest and popular.
- Chart periods: daily/weekly/monthly (recommended); count qualified listens, deduplicate suspicious patterns and apply anti-bot checks.
- Country is inferred only from coarse, privacy-respecting information with user controls; unknown country is allowed.
- Editorial features are independently curated and labeled, not represented as organic rankings.

### 6.3 Qualified play metric — initial recommended definition

- A stream counts only after at least **30 seconds of actual audible playback**, or the full track if shorter than 30 seconds; ignore seeks/looping that artificially inflate time.
- Count at most one qualified play per track per playback session; protect against replay loops, automation, extreme repeat patterns and server-generated events.
- Store raw events with limited retention, and roll up daily aggregates. Tune thresholds with real traffic before tying metrics to money.

## 7. Audio architecture, quality and cost

### 7.1 Source and rendition policy

- Accept WAV, FLAC and MP3 uploads (additional formats only after validation).
- Preserve original bytes privately with checksum and metadata.
- Produce **320 kbps MP3** rendition only when source quality supports it; do not imply quality improvement from upsampling.
- If a source is lossy and below 320 kbps, either reject with an actionable quality warning or serve original quality with transparent labeling. **Recommended launch policy: reject sources below minimum effective quality; product owner must approve exact threshold.**
- Never transcode an existing 320 kbps MP3 unnecessarily if technically compliant; check sample rate, clipping and metadata.
- Validate actual content rather than trusting file extensions or client-provided bitrate.
- Use FFmpeg/ffprobe in an asynchronous worker; set CPU, duration, byte-size and timeout limits.
- Ensure normalization, if implemented, changes playback loudness safely without destroying originals; defer full loudness normalization until tested.

### 7.2 Storage and streaming flow

```
Browser -> Auth/API -> short-lived upload authorization
Browser -> private R2 upload
R2 upload completion -> job queue -> validation/ffprobe/FFmpeg
Worker -> private R2 original + rendition -> DB metadata
Listener -> playback authorization endpoint -> expiring playback URL/token
Browser audio element -> CDN/storage with HTTP Range support
Playback telemetry -> API -> qualified-play aggregation
```

- Private objects must never be listed publicly; upload permissions scoped to a single user/object and limited in time.
- Playback authorization checks publication, visibility, ownership and moderation state.
- Do not leak permanent origin URLs or privileged R2 credentials to browsers.
- Consider edge-proxied signed delivery for abuse resistance; **test whether proxy/CDN behavior and the chosen Cloudflare plan permit the intended audio delivery** before committing.
- CORS, Content-Type, Content-Length, Accept-Ranges, Content-Range and caching behavior must be tested in Safari, Chrome and Firefox.
- Use immutable versioned object keys and clean up orphaned uploads via scheduled maintenance.

### 7.3 Cost model and cautions

- R2 has free egress under its published pricing model, but **storage, operation counts, request patterns, processing, hosting and other services can still cost money**.
- At 320 kbps, a four-minute track is approximately 9.6 MB decimal; one million full listens is ~9.6 TB transferred. Range requests and replay behavior change operation counts.
- Preserving originals plus renditions can double or multiply storage requirements depending on source formats.
- Establish budget alerts, storage quotas, upload limits, rate limits and per-user abuse thresholds.
- Do not assume Vercel/Cloudflare/Supabase free tiers cover all 10,000 users; validate current terms and usage before deployment.

## 8. Data model (PostgreSQL / Supabase)

Use UUID primary keys, UTC `timestamptz`, `created_at`, `updated_at`, foreign keys, appropriate uniqueness and soft-deletion where retention/auditing requires it.

| Table                      | Core fields / purpose                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                 | `id(auth.users)`, handle, display_name, avatar_key, locale, country, settings                                                                                                                                 |
| `staff_roles`              | user_id, role (`super_admin/admin/moderator`), granted_by, granted_at                                                                                                                                         |
| `artist_applications`      | applicant_id, payload, status, reviewer_id, review_notes, timestamps                                                                                                                                          |
| `artists`                  | id, owner_user_id, slug, name, bio, avatar_key, cover_key, accent, featured_track_id, verification_status                                                                                                     |
| `artist_social_links`      | artist_id, platform, url, sort_order                                                                                                                                                                          |
| `albums`                   | id, artist_id, title, artwork_key, description, release_at, status, visibility                                                                                                                                |
| `tracks`                   | id, artist_id, album_id nullable, title, slug, metadata, genre_id, language_code, country_code, production_type, ai_tools, explicit=false, visibility, review_status, publish_status, release_at, duration_ms |
| `track_moods`              | track_id, mood_id (many-to-many)                                                                                                                                                                              |
| `genres` / `moods`         | id, slug, localized label, active                                                                                                                                                                             |
| `audio_assets`             | track_id, kind(original/rendition), object_key, format, bitrate, sample_rate, channels, bytes, sha256, processing_status                                                                                      |
| `artwork_assets`           | owner_id, object_key, dimensions, mime, moderation_state                                                                                                                                                      |
| `track_reviews`            | track_id, reviewer_id, decision, reason, reviewed_at, version                                                                                                                                                 |
| `upload_quotas`            | owner_id, daily_limit, changed_by, changed_at                                                                                                                                                                 |
| `upload_events`            | user_id, track_id, counted_date_utc, status (for quota enforcement)                                                                                                                                           |
| `likes`                    | user_id, track_id, created_at; unique(user_id, track_id)                                                                                                                                                      |
| `artist_follows`           | user_id, artist_id; unique pair                                                                                                                                                                               |
| `comments`                 | id, user_id, track_id, body, status, parent_id nullable, created_at                                                                                                                                           |
| `playlists`                | id, owner_id, title, description, visibility, cover_key                                                                                                                                                       |
| `playlist_tracks`          | playlist_id, track_id, position, added_at; stable ordering                                                                                                                                                    |
| `playlist_follows`         | user_id, playlist_id; unique pair                                                                                                                                                                             |
| `playback_sessions`        | id, user_id nullable, anonymous_session_hash nullable, started_at, last_seen_at                                                                                                                               |
| `playback_events`          | session_id, track_id, event_type, audible_ms, occurred_at, request_id                                                                                                                                         |
| `track_daily_stats`        | track_id, date, country_code nullable, qualified_plays, unique_listeners                                                                                                                                      |
| `notifications`            | user_id, type, actor_id, payload, read_at, created_at                                                                                                                                                         |
| `notification_preferences` | user_id, release_alerts, email_opt_in, push_opt_in                                                                                                                                                            |
| `reports`                  | reporter_id, target_type, target_id, reason, status, assigned_to, resolution                                                                                                                                  |
| `verification_requests`    | artist_id, requester_id, evidence, status, reviewer_id                                                                                                                                                        |
| `featured_slots`           | slot, entity_type, entity_id, start_at, end_at, rank                                                                                                                                                          |
| `audit_logs`               | actor_id, action, entity_type, entity_id, before/after redacted JSON, created_at                                                                                                                              |
| `jobs`                     | type, entity_id, state, attempts, next_run_at, last_error, idempotency_key                                                                                                                                    |

**Important constraints:** unique artist slugs; enforce one Like/follow per user/entity; indexes on `tracks(review_status,publish_status,visibility,release_at)`, search vectors, `comments(track_id,created_at)`, chart aggregates, job scheduling. Use a version or separate immutable `track_versions` table so edits cannot silently replace an approved audio asset. Store consent/version of rights declarations.

### 8.1 RLS and authorization matrix

- Profiles: public safe fields readable; users edit only own profile.
- Artist applications: applicants read/create own; staff review; no self-approval.
- Artists: public profiles readable; approved owners edit own; only staff may set verification or ownership overrides.
- Tracks: public can read only approved, released, non-private/non-blocked metadata; unlisted detail may be fetched by direct ID but not via listing endpoints; private only owner/staff.
- Audio assets: no public DB access to storage keys; authorized playback endpoint resolves eligible rendition.
- Playlists: public visible to all; private only owner; only owner changes membership.
- Comments/likes/follows: authenticated mutations scoped to self; staff moderation capabilities explicitly checked.
- Reports: reporter can view own submission; staff can view/manage cases.
- Staff roles and audit logs: privileged reads; writes only through trusted server-side admin functions.
- All API endpoints validate inputs and authorize again server-side even when RLS exists.

## 9. API / service contracts (illustrative)

All JSON responses use `{ data, error, requestId }`; errors use stable machine-readable codes. Paginate list endpoints using cursors where possible; enforce limits and idempotency for submissions.

| Method / path                                      | Purpose                           | Access                       |
| -------------------------------------------------- | --------------------------------- | ---------------------------- |
| `GET /api/home`                                    | Featured/latest/trending modules  | Public                       |
| `GET /api/search`                                  | Search and filters                | Public                       |
| `GET /api/tracks/:id`                              | Metadata respecting visibility    | Public/authorized            |
| `POST /api/tracks/:id/playback`                    | Authorize time-limited stream     | Public/authorized            |
| `POST /api/playback/events`                        | Ingest playback telemetry         | Public with anti-abuse token |
| `POST /api/artist-applications`                    | Submit artist request             | Listener                     |
| `GET /api/artist-applications/me`                  | Application status                | Listener                     |
| `POST /api/studio/artists`                         | Create identity                   | Approved artist manager      |
| `POST /api/studio/uploads/authorize`               | Issue scoped upload authorization | Approved artist manager      |
| `POST /api/studio/tracks`                          | Create draft                      | Approved artist manager      |
| `POST /api/studio/tracks/:id/submit`               | Send for review                   | Owner                        |
| `POST /api/studio/tracks/:id/schedule`             | Schedule approved release         | Owner                        |
| `POST /api/tracks/:id/like`                        | Like/unlike                       | Listener                     |
| `POST /api/tracks/:id/comments`                    | Create comment                    | Listener                     |
| `POST /api/artists/:id/follow`                     | Follow/unfollow                   | Listener                     |
| `POST /api/playlists`                              | Create playlist                   | Listener                     |
| `PATCH /api/playlists/:id`                         | Update playlist                   | Owner                        |
| `POST /api/reports`                                | Report abuse                      | Listener                     |
| `GET /api/charts`                                  | Charts by period/country/genre    | Public                       |
| `GET /api/notifications`                           | User notifications                | Listener                     |
| `POST /api/admin/artist-applications/:id/decision` | Review application                | Admin+                       |
| `POST /api/admin/tracks/:id/decision`              | Review track                      | Admin+                       |
| `POST /api/admin/reports/:id/resolve`              | Resolve report                    | Moderator+ as permitted      |
| `POST /api/admin/verification/:id/decision`        | Verification                      | Admin+                       |

**Webhooks/jobs:** Auth events, upload completion, transcode completion, scheduled publication, notification fan-out, chart aggregation, cleanup, and moderation escalations. Authenticate webhooks and ensure idempotent retries.

## 10. UI/UX design system

**Direction:** Bold Creative, dark-first, premium, energetic and album-art-led. Avoid visually copying Spotify layouts or branding.

| Token          | Value (initial proposal)                                                    |
| -------------- | --------------------------------------------------------------------------- |
| `background`   | `#090912`                                                                   |
| `surface`      | `#171728`                                                                   |
| `primary`      | `#9D5CFF`                                                                   |
| `accent-coral` | `#FF725E`                                                                   |
| `accent-cyan`  | `#41D9FF`                                                                   |
| `text-primary` | `#F5F5FA`                                                                   |
| `text-muted`   | `#A8A8BA`                                                                   |
| Radius         | 12–20px cards; 999px pill buttons                                           |
| Type           | Inter for Latin; Cairo or IBM Plex Sans Arabic for Arabic (verify licenses) |

### UI components

Global navigation, mobile bottom navigation, hero feature, track row, album card, artist card, chart rank, search filter chips, queue drawer, mini-player, expanded player, comment thread, follow button, share sheet, upload wizard, review queue, moderation detail panel, empty/skeleton/error states, toast and confirmation dialogs.

### Responsive guidance

- Desktop: left navigation rail, scrollable content, fixed bottom player; right contextual queue optionally.
- Tablet: collapsible rail and simplified player.
- Mobile: bottom navigation + sticky mini-player above it; expanded player as full-screen sheet; artwork-led discovery.
- Arabic: logical CSS properties, mirrored directional icons only where semantically appropriate, Arabic number/date formatting based on locale; do not mirror album artwork.
- Color contrast WCAG AA target, focus rings, reduced-motion support, captions/labels for non-text controls.

## 11. Admin and moderation operations

**Dashboard KPIs:** signups, active listeners, qualified plays, published tracks, pending reviews, storage GB, processing failures, reports awaiting action, top genres, country distribution and monthly infrastructure spend.

**Artist application queue:** filters by status/date; applicant profile, portfolio and rights statement; approve/reject/request info; decision notes and notification.

**Track review queue:** waveform/player, metadata, cover, lyrics, AI provenance and rights declarations; reject/changes requested/approve; bulk operations limited to safe administrative actions (no mass blind approval).

**Content policy:** Explicit sexual content prohibited; also define violence/hate/harassment, spam, copyrighted samples, voice cloning, deceptive impersonation, synthetic likeness and minors. Automated flags assist but do not replace required manual review.

**Copyright workflow:** notice intake, evidence capture, temporary restriction, response/appeal, repeat-infringer policy and jurisdiction-appropriate takedown process. Obtain qualified legal review before launch, particularly for music licenses, AI tool commercial terms, and user content distribution rights.

**Operational controls:** configurable quotas, feature flags, region restrictions if legally required, emergency unpublish, role grants, audit logs and retention policy.

## 12. Security, privacy and abuse prevention

- Store all secrets in environment/secret managers; separate dev/staging/prod credentials.
- Enforce email verification as appropriate, OAuth state/PKCE, secure cookies, CSRF protection for cookie-authenticated writes, request validation and rate limiting.
- Use signed, short-lived upload grants; restrict MIME, actual codec, file size and maximum duration.
- Never trust browser-reported metadata or client-only access checks.
- Isolate FFmpeg processing with resource limits; treat uploads as untrusted inputs.
- Protect APIs against enumeration, mass scraping, stream abuse and bot-generated charts.
- Minimize personal data; disclose analytics/cookies and use privacy-safe country detection; support account/data deletion and retention rules.
- Support artist appeal workflows and transparent moderation notices.
- Log security events without logging passwords, OAuth tokens, private URLs or raw secrets.
- Back up PostgreSQL and test restores; maintain object lifecycle and disaster recovery procedures.

## 13. Notifications

MVP: in-app notification center and optional email for important artist application/review outcomes. Release notifications to followers can be in-app initially; optional email requires opt-in and deliverability controls. Push notifications follow with mobile apps. Jobs must deduplicate notifications and respect user preferences.

## 14. Analytics and operational observability

- Track signup funnel, artist application conversion, upload success/failure, time-to-review, publish success, play starts, qualified plays, skips, follows, likes, playlist saves and retention.
- Use aggregated daily metrics for charts and artist dashboards; avoid exposing listener identities to artists.
- Measure p50/p95 API latency, audio start latency, buffering ratio, playback errors, worker failures, job lag, DB load, R2 usage and spend.
- Configure alerts for failed publication jobs, unusually high egress/request rates, unauthorized access attempts and moderation queue growth.

## 15. Implementation architecture and repository layout

**Recommended stack:** Next.js App Router + TypeScript + Tailwind CSS; Supabase Auth/Postgres/RLS; Cloudflare R2 private storage; FFmpeg/ffprobe worker; lightweight job processing; deployment on a low-cost compatible host. Choose job runner based on actual free-tier constraints, not assumed unlimited background processing.

```text
project-ai-music/
  apps/
    web/                 # Next.js web, studio, admin, APIs
  packages/
    ui/                  # shared design tokens/components
    db/                  # schema, migrations, typed queries
    contracts/           # Zod schemas, API contracts, types
    audio/               # metadata validation, quality policy
  workers/
    media/               # FFmpeg processing and job handlers
  supabase/
    migrations/
    seed.sql
    tests/
  docs/
    product/
    architecture/
    runbooks/
  .github/workflows/
```

**Architecture guardrail:** Start as a modular monolith plus an isolated audio worker. Do not build microservices, Kafka, Kubernetes or a recommendation ML stack for the first 10,000 users.

## 16. Delivery roadmap for AI coding tools

### Phase 0 — foundation

1. Initialize monorepo, linting, formatting, strict TypeScript, test runner and CI.
2. Configure Supabase environments, migrations and RLS baseline.
3. Establish design tokens, i18n routing and responsive shell.
4. Configure env schema, error handling, logs, secrets and deployment previews.

**Exit:** CI passes, staging deployment works, no exposed secrets, Arabic/English navigation works.

### Phase 1 — identity and discovery

1. Implement email/password and OAuth providers.
2. Public home, artist, album and track detail pages with sample seed data.
3. Search, filters, SEO, structured data and share previews.
4. Guest browsing and authenticated listener profile.

**Exit:** User can browse/search public seed catalog; all sign-in methods verified on target environments.

### Phase 2 — audio delivery and player

1. Implement private R2 object model and secure playback authorization.
2. Implement global audio player, queue, shuffle/repeat, autoplay and media-session controls.
3. Implement event ingestion and qualified-play aggregation.
4. Verify range seeking, cross-browser behavior and performance.

**Exit:** Public approved test track streams at actual validated quality; private tracks cannot be accessed by unauthorized users.

### Phase 3 — artist publishing

1. Artist application and admin review.
2. Multiple artist identities and customization.
3. Direct upload, metadata extraction, worker processing and quality checks.
4. Track/album drafts, review, release scheduling, visibility and upload quotas.
5. Artist dashboard and basic analytics.

**Exit:** Full application -> approval -> upload -> review -> scheduled/public release workflow works end-to-end.

### Phase 4 — community and administration

1. Likes, comments, follows, public/private playlists and library.
2. Notifications and preferences.
3. Reports, comment moderation, verification and staff role restrictions.
4. Featured slots, charts, audit logs and admin metrics.

**Exit:** Abuse/report flows work, staff permissions tested, chart rankings reflect qualified plays only.

### Phase 5 — launch hardening

1. End-to-end regression, security and RLS tests.
2. Accessibility and RTL audits; mobile responsive QA.
3. Load tests for first-10k-user scenario (define concurrent load from observed usage).
4. Backup/restore drill, spend alerts, legal policy review, operational runbooks.
5. Production domain, analytics, search console, robots and sitemaps.

**Exit:** Launch checklist signed off; rollback and incident response documented.

## 17. Acceptance tests / definition of done

- **Guest playback:** A guest can start a public approved track without signing in; Like prompts login without losing context.
- **Approval gate:** A pending/rejected track cannot be played by the public, even if its storage key is guessed.
- **Scheduled release:** Approved track is invisible until scheduled UTC release; publishes exactly once after due time.
- **Private/unlisted:** Private requires ownership; unlisted is reachable by link but absent from public search, charts and sitemap.
- **Audio quality:** Uploaded 320 kbps file is preserved; lower-quality source is not misrepresented as improved quality.
- **Artist ownership:** User A cannot modify User B's artists, albums or tracks by changing IDs in requests.
- **Upload quota:** Sixth counted upload in one UTC day is blocked for a new account; retries do not double count.
- **Playback metrics:** A Play click without listening does not count; qualified listening does; bot-like repeats are flagged.
- **Comments:** Signed-in users can comment; moderators can hide abusive comments; all actions audited.
- **Follow notification:** Followers with notifications enabled receive one event per new eligible release.
- **Playlists:** Private playlists are invisible to other accounts; public playlists are followable.
- **OAuth:** Google, Apple and Facebook redirect/callback flows are tested in production-like environment.
- **Accessibility:** Player controls usable by keyboard and screen reader; Arabic pages lay out correctly.
- **Resilience:** Interrupted uploads recover or clean up; worker retries are idempotent; expired playback URLs fail safely.

## 18. Required tests

**Unit:** eligibility/visibility functions, upload quota, bitrate policy, chart scoring, slug normalization, i18n formatters.  
**Integration:** RLS, artist application decisions, upload authorizations, audio processing jobs, review transitions, scheduled publication, notifications.  
**E2E:** guest play, signup, OAuth callback, artist application, admin approval, upload, moderation, public release, comment, playlist and report.  
**Security:** IDOR, privilege escalation, signed URL expiry, rate limiting, forged playback events, private metadata exposure, file upload fuzz cases.  
**Performance:** audio time-to-first-byte, seek behavior, slow mobile connections, queue transition, DB chart queries, admin review under load.

## 19. Release checklist

- [ ] Product owner approves final name, logo, domains and app identifiers.
- [ ] OAuth provider credentials and callback URLs configured and tested.
- [ ] Legal counsel reviews terms, privacy, copyright/takedown, AI voice policy and regional obligations.
- [ ] All RLS policies reviewed and negative-access tests pass.
- [ ] R2 access is private; playback authorization and Range support verified.
- [ ] Actual audio quality detection and original preservation verified.
- [ ] Manual moderation team/workflow and response-time targets established.
- [ ] Quotas, anti-abuse limits, budget alerts and observability active.
- [ ] Database backup and restoration tested.
- [ ] Arabic/English copy, SEO metadata, social cards and responsive layouts reviewed.
- [ ] No ads, paid subscriptions, downloadable MP3 or unapproved AI generation features inadvertently enabled.
- [ ] Staging and production separated; rollback documented.

## 20. Remaining implementation clarifications (not blockers for drafting)

These items were **not explicitly decided** and should be resolved during implementation planning without silently inventing product policy:

1. Exact maximum audio duration and upload size; accepted sample rates; whether sub-320 kbps uploads are rejected or transparently served at source quality.
2. Whether artist application approval is per account (recommended) and who may create subsequent identities.
3. Whether new edits to approved releases require reapproval (recommended yes), and whether older version remains public pending approval.
4. Exact country chart attribution rules and whether users may choose their display country.
5. Comment reply threading, editing/deletion window and profanity policy details.
6. Notification channels at web launch (in-app required; email optional with consent).
7. Detailed release scheduling rules for private/unlisted tracks and album-wide release consistency.
8. Account deletion, content ownership transfer and appeal retention timelines.
9. Deployment vendor/worker selection after validating current free-tier terms and limits.
10. Minimum age, age verification and regional privacy/legal requirements.

## 21. Instructions for an AI coding agent

1. Read this entire document before coding. Treat **locked decisions** as requirements and **recommendations** as provisional defaults.
2. Implement in the phase order above; never scaffold all screens without working authorization and data flows.
3. Before each phase, produce a brief task plan, migrations, API contracts, test plan and estimated external service costs.
4. Use migration files for every database change and test RLS using both authorized and unauthorized identities.
5. Never store service-role keys in client bundles; never expose private storage URLs or grant self-assigned staff roles.
6. Write real integration tests for upload -> processing -> review -> publication -> playback.
7. Use typed schemas and shared validation between API and UI. Implement accessible loading/error/empty states.
8. Avoid fabricated analytics, fake counters and placeholder buttons in production.
9. Document environment variables, setup, deployments, recovery and troubleshooting in `/docs/runbooks`.
10. At the end of each phase report: implemented files, migrations, passing tests, unresolved issues, security checks and next-phase dependencies.

---

**Document end.** This specification is designed for a lean first release and can be extended with detailed screen-by-screen wireframes, SQL migrations and implementation tickets as coding proceeds.
