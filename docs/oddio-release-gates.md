# Oddio — Phase 6 Release Readiness & Go/No-Go

**Status: NOT APPROVED FOR PRODUCTION.** This document tracks executable release gates rather than declaring launch readiness. Pull requests #1–#6 form a stacked sequence: each must be reviewed, tested and merged in dependency order.

## Consolidated audit findings — 13 Nov 2026

- **Repository:** Phase 1–6 changes are stacked in draft review branches. No production merge or rollout has been approved.
- **Prettier debt:** resolved on the review branch. The combined CI run `43473116951` passed formatting, TypeScript, lint, build, HTTP smoke tests, release-env checks, DB/RLS and Chromium browser flows.
- **User journeys:** the 10-route HTTP smoke suite and revised bilingual Chromium flows passed against the built demo. They do not verify production R2 streaming or Supabase authorization with actual user sessions.
- **Live data:** read-only Supabase inspection found 2 tracks, 1 artist and 2 audio assets. One published/approved track still points at a pending original MP3 asset with provisional size data. The streaming route permits a signed original fallback for this key shape, but actual R2 delivery and audible playback are not yet verified.
- **Supabase RLS:** every inspected public table had RLS enabled. Security Advisors still flag eight `SECURITY DEFINER` helper functions callable by anonymous/authenticated users and disabled leaked-password protection. The boolean-returning helpers are referenced by access-control policies, so blindly revoking grants could break RLS; investigate, simulate calls and review a migration in staging before production permission changes.
- **Database:** the advisor also reports missing foreign-key indexes (performance) and five RLS-enabled internal tables without client policies, which may be intentional for service-only resources. Validate actual exposure before altering permissions.
- **Vercel:** preview deployments were using `DEMO_MODE=false` without a preview `SUPABASE_SERVICE_ROLE_KEY`, causing real runtime errors and a 500 sitemap despite a successful build. Preview is now explicitly configured for isolated ephemeral demo mode; production remains `DEMO_MODE=false`. `NEXT_PUBLIC_SITE_URL=https://oddio.vercel.app` is now configured for preview and production, but existing deployments need rebuilding before their cached canonical metadata changes. The authenticated media-cron route instead requires `CRON_SECRET`, which is configured for production; audio-worker runtime readiness remains unverified.
- **Moderation:** fixed Admin Reports server page to read Supabase in real mode, matching the Phase 5 report API storage adapter. Actual end-to-end report creation, moderation and rights takedowns in a staging project remain unverified.
- **Release checks:** `npm run release:preflight` validates production configuration without printing secrets; it must be executed with the actual release environment in a protected context.

## Release blocker remediation — 13 November 2026

- [x] **Serverless media retries:** bound stalled leases to 20 minutes, then safely requeue with retries and terminal dead state. This fix is in review; it does not yet reset the existing live jobs until a verified production deployment runs the authenticated cron.
- [x] **Media worker R2 paths:** allow MP3 output file extensions in safe keys, use original/streaming bucket defaults, preserve rendition asset type.
- [x] **HTTP audio fixture:** test actual MP3 authorization, stream bytes, first and suffix ranges, malformed Range rejection and invalid playback tokens in CI. The tests pass on review SHA `a1ccb8e` (GitHub CI run 43477404302).
- [x] **RLS helpers:** create migration `20261113195500_private_rls_helpers.sql` moving privileged boolean helpers to a non-exposed schema while retaining RLS dependencies. Executable RLS tests pass on an isolated PostgreSQL test database. **This migration is not applied to the live project.**
- [x] **Actual scheduler config:** Vercel has a production `CRON_SECRET` and the app registers `/api/cron/media` in `apps/web/vercel.json`. `MEDIA_WORKER_SECRET` is not required for this scheduled endpoint, so the release preflight now checks the real credential.
- [ ] **Live R2 validation:** do not claim real sound playback until a signed request against the actual private R2 bucket succeeds and an audible sample is played.
- [ ] **Apply RLS migration safely:** run pre-/post-change tests in staging before production migration; confirm no unexpected schema exposure and rerun Supabase Security Advisors.
- [ ] **Leaked password protection:** enable in Supabase Auth password settings if the plan supports it; feature is available on Supabase Pro and above. Otherwise keep a documented compensating policy and assess plan upgrade separately.
- [ ] **Cross-browser:** Playwright Chromium/Firefox/WebKit jobs have been added; record results on the final tested commit. Browser emulation is not physical-device testing.
- [ ] **Actual production:** verify live media jobs, cron invocation logs, storage object integrity and error monitoring after a reviewed deployment. No automated action should claim production readiness based solely on test fixtures.

## Gate A — Security and data (blocking)

- [ ] Validate the live Vercel project runs with `DEMO_MODE=false` and properly scoped Supabase/R2 secrets (without printing secrets).
- [ ] Validate ownership and moderation permissions against staging Supabase with the exact deployed RLS schema.
- [ ] Prove user A cannot access private songs, likes, playlists, reports or artist data belonging to user B.
- [ ] Verify no client bundle contains service-role secrets, R2 credentials or privileged bearer tokens.
- [ ] Verify account deletion/export and retention behavior; document remaining privacy/legal work.
- [ ] Review moderation race conditions, duplicate submission concurrency and idempotent writes.
- [ ] Test copyright/voice likeness reporting, takedown, human review, and appeals with actual content and applicable policies.
- [ ] Validate backups, recovery, rollback and rate limiting.
- [ ] Confirm use of public catalog only in sitemap and recommendations.

## Gate B — Reliability and playback (blocking)

- [ ] Confirm stream validity, range requests, expiry renewal, buffering retries and graceful failures with actual audio.
- [ ] Test queue restore after refresh, repeat one/all, shuffle, mute, and background Media Session behavior.
- [ ] Cross-user session switch does not show prior users' queue or preferences.
- [ ] Playback events register only when audio actually starts; prevent duplicate session metrics.
- [ ] Test at least three different network modes, including slow network and offline recovery.
- [ ] Test long-track and empty/failed artwork metadata.
- [ ] Verify storage/CDN egress and database/API cost budgets.

## Gate C — Product experience

- [x] Add smoke suite for English and Arabic home/search/discover/soundspace plus sitemap/robots.
- [x] Add smoke execution against a running built Next.js server to CI.
- [x] Use production Supabase catalog for sitemap instead of demo snapshot.
- [x] Localize route error recovery and fix error/404 button contrast.
- [ ] Test all core journeys with real browser interaction, screen readers, touch and keyboard-only input.
- [x] Run Chromium Desktop/Mobile Arabic/English interaction checks in CI.
- [ ] Verify Firefox and Safari with real devices and confirm player behavior.
- [ ] Audit RTL mix of Latin song titles and Arabic UI, text wrapping, input direction, and back navigation.
- [ ] Accessibility review: WCAG 2.2 AA contrast, focus, ARIA, dynamic status announcements, reduced motion.
- [ ] Verify pages without playable tracks, images or connectivity do not dead-end.
- [ ] Validate cross-language URLs and metadata without redirect loops.

## Gate D — CI and operating discipline

- [x] Keep existing typecheck, unit, production build, lint and RLS checks.
- [x] Full-repository Prettier check is green in CI run 43473116951.
- [ ] Run smoke suite and record results on the final review SHA.
- [ ] Inspect final preview and create a screenshot/video capture checklist for mobile and desktop.
- [ ] Set monitoring: playback start success, buffering time, API errors, 5xx rate, search zero results.
- [ ] Define incident owner, rollback command, fallback banner and release notes.
- [ ] Stage canary rollout; confirm owner approval before production promotion.

## Explicit boundaries

The Phase 6 HTTP smoke test confirms page responses and basic bilingual HTML, **not** touch behavior, playback quality or authorization. Demo-mode tests alone cannot prove production Supabase/R2 reliability. Formatting normalization is review-branch-only. A successful Vercel preview build is not a launch approval. Nothing should be promoted to production until all blocking gates are verified.
