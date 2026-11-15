# Oddio master plan — implementation tracker

Status: **Phase 0 in progress**, Phase 1 blocked on verified production data inventory.  
Working branch: `feature/master-plan-phase-0-1`.  
**Do not switch the production data layer or delete the JSON store without an approved, tested migration and rollback.**

## Phase 0 — release safety and baseline

- [x] Work on a branch separate from `main`.
- [x] Harden the production environment URL preflight, and add regression tests.
- [x] Existing CI is present for type checking, unit tests, build, route/audio smoke tests, RLS checks and desktop/mobile browser tests.
- [ ] Confirm the current Vercel deployment, attached domain and environment targeting.
- [ ] Inspect current Supabase tables, rows and auth configuration (read-only).
- [ ] Record actual content counts and authoritative source of users, tracks, playlists, likes and follows.
- [ ] Capture a restorable backup of production data and verify restore in a disposable environment.
- [ ] Run CI on the pull request, inspect failures and review the deployment preview.
- [ ] Establish baseline playback, search, sign-in, upload and mobile smoke checks against the preview.

## Phase 1 — persistent data and media

- [ ] Inventory readers/writers using `apps/web/src/lib/data/queries.ts`, `mutations.ts` and the demo repository.
- [ ] Define an explicit repository interface and Supabase-backed adapter without changing public API contracts.
- [ ] Map JSON IDs and relationships to the Supabase schema; establish an idempotent import with dry-run and reconciliation counts.
- [ ] Preserve existing account ownership, review state, playlists, likes, follows, release schedules and qualified play counts.
- [ ] Backfill existing content with a recovery plan; verify RLS in CI and staging.
- [ ] Migrate each write route behind a controlled rollout and verify read-after-write behavior.
- [ ] Verify R2 master/rendition upload grants, worker processing, signed streaming, seeking and retry behavior.
- [ ] Enable production persistence only after matched reconciliation, tested backup/restore and successful staging acceptance.
- [ ] Monitor database errors, upload failures and playback errors after rollout.

## Phase 2 — layout and player

- [ ] Validate Arabic RTL, English LTR, mobile no-horizontal-scroll, footer clearance and bottom navigation.
- [ ] Test mini-player and full player across viewport sizes; preserve the gradient play icon without an opaque backdrop.
- [ ] Fix/verify tooltips, accessible control labels, shuffle/repeat feedback, queue and lyrics auto-scroll.
- [ ] Verify range seeking, reconnection and playback survival across routes.

## Phase 3 — library and search

- [ ] Saved tracks/albums, follows, playlist editing and sorting.
- [ ] Listening history with privacy and deletion controls.
- [ ] Continue listening and queue persistence.
- [ ] Bilingual typo-tolerant search, artist transliteration, filters, genre families and moods.

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
- Existing CI already includes PostgreSQL RLS and browser coverage; do not duplicate it.
- Production backend, live domain routing, backups and storage credentials have **not** been verified by this change.
- Do not run destructive database migrations or import demo content into production without an inventory and recovery plan.
