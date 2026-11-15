# Oddio master plan — implementation tracker

Status: **Phase 0 in progress**, Phase 1 blocked on verified production data inventory.  
Working branch: `feature/master-plan-phase-0-1`.  
**Do not switch the production data layer or delete the JSON store without an approved, tested migration and rollback.**

## Phase 0 — release safety and baseline

- [x] Work on a branch separate from `main`.
- [x] Harden the production environment URL preflight, and add regression tests.
- [x] Existing CI is present for type checking, unit tests, build, route/audio smoke tests, RLS checks and desktop/mobile browser tests.
- [x] Confirm Vercel project `oddio` and that `oddio.online` is verified on that project; preview is isolated with `DEMO_MODE=true`. Production release health still needs investigation.
- [x] Inspect connected Supabase `project-ai-music` table inventory, migration history and security advisor (read-only); auth configuration beyond advisor not yet audited.
- [x] Record existing Supabase content counts (32 tracks, 4 profiles, 1 artist, zero playlists at 2026-11-15); which HTTP endpoints use this storage still requires verification.
- [ ] Capture a restorable backup of production data and verify restore in a disposable environment.
- [ ] Run CI on the pull request, inspect failures and review the deployment preview. Initial Vercel build failed on a pre-existing strict TypeScript sidebar link error; fixed on this branch and pending recheck.
- [ ] Establish baseline playback, search, sign-in, upload and mobile smoke checks against the preview.

## Current findings (2026-11-15)

- Vercel project `oddio` exists and `oddio.online` is verified. The configured NEXT_PUBLIC_SUPABASE_URL host matches the owner-confirmed `project-ai-music` ref; this does NOT prove each API route reads from the database.
- Previous production deployments and the first development previews were blocked by a strict TypeScript error in `apps/web/src/components/layout/Sidebar.tsx` (optional `split('#')[0]`). A nonvisual fix has been committed to this branch.
- The latest known READY production deployment predates the most recent `main` commits; do not assume `main` is live.
- The correct connected Supabase project is `project-ai-music` (`weflfkftkdlrolctdmae`, eu-central-1), confirmed by the project owner. It is active and contains 32 tracks, 1 artist, 4 profiles, 59 genres, 24 moods and 37 audio asset rows (snapshot from 2026-11-15). The database is not empty: **never import seed/demo user data over it**. All 36 observed public tables have RLS enabled.
- Security advisor flags 7 policy-less RLS tables at informational severity (possibly intentional deny-all), and leaked-password protection disabled. Audit who should access these tables before considering grants; never blindly create permissive policies.
- Confirm Vercel production Supabase project reference matches this project before any write. The project name alone does not verify runtime wiring.
- Vercel environment variables were inspected without decryption; no sensitive values were read.
- `NEXT_PUBLIC_SITE_URL` is configured as `https://oddio.vercel.app` for preview and production; assess canonical domain alignment with `oddio.online` once release health is restored.

## Phase 1 — persistent data and media

- [ ] Complete route-by-route inventory. Confirmed the application already has a full Supabase snapshot adapter (`supabase-store.ts`); Home and Discover read from it in production. Some API routes were still calling `mutateDb` or `readDb` directly, which is ephemeral on Vercel. This branch migrated likes, artist follows, and playlist CRUD to a runtime selector.
- [x] Existing Supabase snapshot adapter identified; added `runtime-store.ts` selecting the configured DB and preserving public API shapes. This is a bridge, not a final transactionally safe design.
- [ ] Map JSON IDs and relationships to the Supabase schema; establish an idempotent import with dry-run and reconciliation counts.
- [ ] Preserve existing account ownership, review state, playlists, likes, follows, release schedules and qualified play counts.
- [ ] Backfill existing content with a recovery plan; verify RLS in CI and staging.
- [ ] Migrate each write route behind a controlled rollout and verify read-after-write behavior. Initial branch coverage: track like, artist follow, playlist list/create/update/delete, add/remove tracks, and playlist follow. **NOT production deployed**. The latest branch replaces social toggles with server-only locked PostgreSQL RPCs, handles playlist additions/removals under a playlist row lock, and uses owner-scoped single-statement playlist CRUD. The migration must be applied in a verified staging/production rollout before production can call these RPCs. Other snapshot-diff endpoints may still be non-transactional.
- [ ] Verify R2 master/rendition upload grants, worker processing, signed streaming, seeking and retry behavior.
- [ ] Verify transactional social test suite (`supabase/tests/social_atomic.sql`) and browser CI; on staging, test concurrent likes and playlist additions with two sessions.
- [ ] Before release: take tested backup, apply `20261115183000_atomic_social_interactions.sql`, confirm only service_role has EXECUTE, verify RPC read/write with test identities, then deploy matching web code. Never deploy new RPC-dependent code ahead of the database migration.
- [ ] Enable production persistence only after matched reconciliation, tested backup/restore and successful staging acceptance.
- [ ] Monitor database errors, upload failures and playback errors after rollout.

### Verification snapshot (2026-11-15)

- GitHub Actions database job **passed** on commit `7dcf5f95a38c7605b518736d65da289a723577e7` (run 43708717643). The job runs the full schema on a disposable PostgreSQL instance, RLS checks, atomic social SQL checks, and a parallel concurrency exercise (8 toggles for each social edge and 8 concurrent adds). No production rows were used.
- A Vercel Preview of commit `f795b43623a401e5afc7603788944a498598611f` was **READY**. The newest Preview still requires status confirmation.
- `project-ai-music` has no Supabase development branches. We avoided creating one because it may incur hourly charges; the CI disposable database is NOT a full staging project.
- Whole-repository formatting currently fails on legacy files (31 were reported by the CI run checked). Do not claim all quality gates passed until this is resolved.
- No verified restorable production backup/restore procedure is available through the current connector. **Do not deploy the new RPC-dependent code to production until a backup and staging release are verified.**
- The current PR stays Draft, production remains unchanged.

### Cloudflare R2 playback cost guard (2026-11-15)

- Reviewed `apps/web/src/app/api/stream/[id]/route.ts`: authenticated/non-demo requests validate the playback token and track access, then return **307 redirect** to a signed Cloudflare R2 GET URL. **Vercel does not proxy the audio bytes** on this path. Local demo mode is the only path which serves audio bytes from the application filesystem.
- Aligned signed R2 GET expiration (rendition and original-MP3 fallback) to **1800 seconds** to match the current 30-minute playback token, reducing mid-track seek/retry expiration failures. Signed links remain bearer URLs; reassess the TTL for private/unlisted content and implement refresh-on-failure for long sessions.
- Added `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer` on the streaming redirect, and a static regression test under `apps/web/src/lib/storage/r2-stream-architecture.test.ts`.
- **R2 outbound transfer to the internet is not itself billed**, but R2 operations/storage and any Cloudflare/Worker features beyond free allowances can cost money. R2 presigned URLs are issued for the S3 API endpoint and cannot be used on a custom domain directly.
- [ ] Validate real streaming and HTTP byte ranges from the browser against a non-production R2 object, including Safari, long listening sessions and signed URL refresh. PlayerProvider retries failed media loading with a fresh authorization (maximum two times per track, 1.5s/3s backoff), restoring the previous position on loadedmetadata; `recoverablePlaybackPosition` now handles browsers that reset the failed audio element time to zero. Manual Retry on the same track also preserves the saved time and audible-progress state. Vitest checks policy/position, not real R2 behavior. A manual R2 S3 GET smoke check is available via `ODDIO_R2_TEST_URL=<temporary signed URL> node scripts/smoke-r2-range.mjs`. It verifies two 206 byte-range responses without logging the signed URL; use only a non-production audio test object. Real browser/CORS, offline and expiry behavior are still unverified.
- [ ] Check the correct cache/edge-delivery architecture and bucket configuration using the user's Cloudflare account. No Cloudflare bucket settings or production audio files were changed in this branch.

### Rollout dependency: required SQL migration

`apps/web/src/lib/data/atomic-social.ts` calls `oddio_toggle_track_like`, `oddio_toggle_artist_follow`, `oddio_toggle_playlist_follow`, `oddio_add_playlist_track`, and `oddio_remove_playlist_track`. All five must be installed before releasing these production routes. Preview remains isolated with `DEMO_MODE=true`. No live data was changed during branch development.

### Phase 1 follow-up — playback telemetry and worker hardening (2026-11-15)

- [x] Production playback authorization sessions now use `mutateRuntimeDb`, rather than modifying an unpersisted Supabase snapshot.
- [x] Playback event API no longer writes to ephemeral JSON in production. It persists event rows through the Supabase snapshot bridge and avoids incrementing the production qualified-play counter twice: the database trigger owns it. Added an isolated SQL check to `supabase/tests/playback_qualified.sql`.
- [x] Reject playback events for another signed-in user's session even if the requester is anonymous.
- [x] Corrected R2 object-key and AWS date regex escaping in `workers/media/src/index.mjs`. Added CI checks that fail if production worker config is incomplete; no demo fallback when `DEMO_MODE=false`.
- [x] Updated `README.md` and `docs/production.md` to describe actual Supabase/R2 architecture and current 25 MiB single-PUT limit, instead of old demo-only assumptions.
- [ ] Replace snapshot-diff session/event persistence with transactional, idempotent targeted SQL writes before significant scale; simultaneous qualified events and counters remain a potential source of races.
- [ ] Verify a real, continuously running media worker and R2 integration; the repo cannot demonstrate that the worker is deployed from CI alone.
- [ ] Verify a full production backup/restore, staging auth/data workflow, real R2 CORS/range uploads, and the latest browser/format gates before merge or release.

### Live read-only media inventory (2026-11-15)

Read-only SQL against the connected Supabase production project reported
**27 succeeded** `media.transcode` jobs and **5 dead** jobs. Four dead jobs
have the generic message `Processing failed`; one reported an invalid MP3
header. There are **32 ready audio assets** and **5 pending/processing/failed
assets**; at the time of review there were **0 playback sessions and 0
playback events**. These are snapshots, not proof of ongoing worker health.

- [ ] Inspect those five jobs/objects with appropriate artist access and
      production logs, validate actual file signatures, distinguish old fixture
      failures from current worker failures and reconcile asset statuses.
- [ ] Do not automatically replay dead jobs or delete original R2 objects.
      Any requeue requires a reviewed cause and a verified backup.
- [ ] Confirm the permanent media worker process is actually running and
      publishing in production; successful historical jobs alone do not prove it.

## Phase 2 — layout and player

- [ ] Validate Arabic RTL, English LTR, mobile no-horizontal-scroll, footer clearance and bottom navigation.
- [ ] Test mini-player and full player across viewport sizes; preserve the gradient play icon without an opaque backdrop.
- [ ] Fix/verify tooltips, accessible control labels, shuffle/repeat feedback, queue and lyrics auto-scroll.
- [ ] Verify range seeking, reconnection and playback survival across routes.

### Phase 2 implementation update (2026-11-15)

- [x] Fixed the mobile navigation drawer to appear at the physical **left** in both Arabic RTL and English LTR. Mobile header menu alignment likewise remains physically left. Added browser assertions for drawer coordinates and Escape dismissal.
- [x] Full-screen music player now locks scrolling of the underlying page while expanded, restores original overflow when minimized and supports Escape to close (or dismiss the overlaid mobile lyrics first).
- [x] Repeat controls in the full and mini players now report the active state with `aria-pressed`, in addition to the existing tooltips and mobile feedback.
- [x] Added demo-browser interaction checks covering actual home-track playback, opening the fullscreen player, Lyrics/Queue tab selection, mobile lyric overlay, Shuffle/Repeat state, modal keyboard focus and footer clearance without horizontal scroll in both locales.
- [x] Isolated the audio-playing page from unrelated search and authentication browser tests so WebKit navigation cancellations from outstanding playback requests do not pollute later route checks.
- [x] Kept fullscreen focus trapping stable when the current track changes, rather than restoring focus on every next-track transition.
- [ ] Validate that the expanded player works on actual Android/iOS devices, including the soft keyboard, small landscape viewport, live synchronized lyrics and genuine R2 streaming. CI demo-browser tests are not real-device acceptance.
- [ ] Run latest Chromium/Firefox/WebKit mobile and desktop CI across Arabic and English. Browser tests use **demo audio** and do not prove real R2 playback.
- [ ] Add full-player real-device coverage for mobile landscape, small screens, lyrics overlay, queue, seeking and keyboard focus trapping; review screen-reader labels and scrolling with iOS Safari.
- [ ] Confirm nav/footer clearance visually on a real iPhone and Android device. The new browser test covers drawer alignment, not every viewport or overlay state.

## Phase 3 — library and search

- [ ] Saved tracks/albums, follows, playlist editing and sorting.
- [ ] Listening history with privacy and deletion controls.
- [ ] Continue listening and queue persistence.
- [ ] Bilingual typo-tolerant search, artist transliteration, filters, genre families and moods.

### Phase 3 delivery slice (2026-11-15)

- [x] Added bilingual search filters to the web page: active Genre, Mood, Arabic/English language, relevance/newest/popular sorting. Filters also work without a text query, and cursor-based “More tracks” retains the applied choices.
- [x] Fixed empty-search-state detection to include matching public playlists, and prevented genre-only queries from returning unrelated artists/albums/playlists.
- [x] Liked-song “Recently added” library order now uses each like's `createdAt` rather than unspecified database row order.
- [x] Added isolated Vitest coverage for liked song ordering/private-track exclusion, genre-only search, paginated public tracks, and private-playlist search visibility; added a bilingual browser test for filter submissions.
- [ ] Validate all current Phase 3 CI runs before merge. Existing Phase 2 and Phase 1 production release gates remain in effect.
- [x] Added one-edit typo matching for normalized Arabic/English search words with 5+ characters; preserve exact matching for short terms and avoid paid AI APIs. Added regression tests for Arabic letter variants, English spelling mistakes and false matches.
- [x] Supabase library listening history now derives from **qualified** playback events, excludes anonymous sessions and retains the latest qualified listen per user/track. Added isolated tests for ownership, short starts and deduplication; this does not change or erase the underlying events.
- [ ] Provide a reviewed privacy control for deletion of source playback event data (not merely hiding the derived history), plus account-aware retention and storage policies. No production migration or event deletion has been performed.
- [ ] Add listening-history privacy/deletion controls, persistent continue-listening and cross-device queue (requires careful database ownership, authorization and migration review).
- [ ] Add consent-safe typo suggestions, artist-authorized transliteration aliases, and broader music-language support; the current normalizer intentionally does not invent artist name transliterations.

### Phase 3 account privacy, cross-device resume and aliases (development branch)

- [x] Added an authenticated, CSRF-protected DELETE `/api/library/history` endpoint and bilingual confirmation button. In demo it removes owned sessions/events/history; in production it deletes **only the authenticated user's playback_sessions**, with `ON DELETE CASCADE` removing raw playback events. It does **not** rewind anonymous listens, other users' data or already-aggregated chart statistics.
- [x] Changed signed-in browser session persistence from tab-lifetime `sessionStorage` to user-namespaced `localStorage`; guests keep per-tab storage. Added a paused-state reload browser test.
- [x] Added an account-owned `player_resume_states` migration, service-only RLS privileges and GET/PUT `/api/player/resume`. It stores track/queue IDs, position and playback preferences (no signed audio URLs or autoplay on restore). Restored tracks are rechecked for viewer access. A disposable PostgreSQL permission test is in the DB CI.
- [x] Added `searchAliases` for artist-confirmed spellings and a studio editor backed by an owner-only API. Both artist and track search consider aliases but do not invent transliterations.
- [ ] **Do not merge or deploy until the two new migrations** `20261115190000_player_resume_states.sql` and `20261115191000_artist_search_aliases.sql` **are tested and applied in a safe database rollout before the dependent web routes.** The older atomic social RPC migration is also still awaiting a staged release.
- [ ] Verify production authenticated server routes and multi-device refresh against a **non-production Supabase project** with both migrations installed. Demo tests cannot prove cross-device Supabase behavior.
- [ ] Define an explicit retention policy for aggregate chart counters and derived anonymized analytics. History deletion removes raw owned playback events but does not modify previously accumulated nonpersonal counters.
- [ ] Test real mobile navigation and audio seek after cross-device restoration with a real R2 object.

## Phase 4 — music intelligence

- [ ] Consent/rights-aware music metadata and AI creation disclosures.
- [ ] Background genre/mood/BPM/audio-feature extraction with artist corrections.
- [ ] Duplicate detection, audio similarity and measurement of classification quality.

## Phase 5 — personalized discovery

- [ ] Personal recommendations, Oddio Flow and control over unwanted genres.
- [ ] Song/artist/genre/mood radio, Daily Mix and Discover Weekly.
- [ ] Prompt-driven playlist generation with a no-paid-API baseline.
- [ ] Personalized home, Rising Artists, Spotlight and fair exposure controls.

## Phase 6 — artist studio

- [ ] Reliable multipart uploads with progress and resume; structured release wizard.
- [ ] Creator credits, rights disclosures, editorial review and appeals.
- [ ] Aggregated artist analytics, audience insights, scheduled releases and profiles.

## Phase 7 — community and growth

- [ ] Collaborative playlists, sharing cards, reactions and creator stories.
- [ ] Real-time listening rooms with moderation and ownership rules.
- [ ] Music DNA, monthly recaps, annual Rewind and optional social discovery.

## Phase 8 — mobile and advanced playback

- [ ] PWA eligibility and cross-device account sync.
- [ ] Android/iOS wrapper or native-shell proof of concept with background playback.
- [ ] Offline rights-compliant listening, push, lock screen and headset controls.
- [ ] Gapless, crossfade, normalization and optional EQ; evaluate car integrations later.

## Continuous release gates (every phase)

1. No direct production deploy from a work-in-progress branch.
2. Typecheck, lint, formatting, unit tests, RLS tests, build and browser smoke checks pass.
3. Arabic + English, desktop + mobile, auth, playback and content permissions are rechecked.
4. Schema/data changes require rollback, reconciliation and verified backups.
5. Never expose secrets in source control, logs or public build variables.
6. Measure playback success, initial audio latency, D7 retention, discovery saves and upload approval turnaround.
7. Feature-complete means tested in staging, not merely present in code.

## Known facts and outstanding verification

- The repository documentation currently describes the runtime data store as demo JSON despite Supabase schema artifacts being present. **This is a source-code/documentation finding, not a live production audit.**
- Existing CI already includes PostgreSQL RLS and browser coverage; do not duplicate it. Updated `scripts/audit-persistence.mjs` to detect API routes with unguarded demo-only access rather than treating the coexistence of demo JSON and Supabase adapter as a blocker. CI runs it advisory-only; full production readiness still requires runtime tests and route audit.
- Production backend, live domain routing, backups and storage credentials have **not** been verified by this change.
- Do not run destructive database migrations or import demo content into production without an inventory and recovery plan.
