# Oddio — Phase 6 Release Readiness & Go/No-Go

**Status: NOT APPROVED FOR PRODUCTION.** This document tracks executable release gates rather than declaring launch readiness. Pull requests #1–#6 form a stacked sequence: each must be reviewed, tested and merged in dependency order.

## Consolidated audit findings — 13 Nov 2026

- **Repository:** Phase 1–6 changes are stacked in draft review branches. No production merge or rollout has been approved.
- **Prettier debt:** a dedicated formatting pass normalized the workspace, and the final Studio route fix landed in commit `bfadb104`. Recheck the full CI gate on the final hardening SHA.
- **User journeys:** the existing 10-route HTTP smoke suite passed in GitHub CI. Interactive Chromium checks initially passed 9/12; 3 searches were checked before streamed navigation settled. The revised suite waits for the actual empty state and includes a demo login/library path. Final run remains a release gate.
- **Live data:** read-only Supabase inspection found 2 tracks, 1 artist and 2 audio assets; do not infer that the full music player, billing or uploads have been validated by these counts.
- **Supabase RLS:** every inspected public table had RLS enabled. Security Advisors still flag eight `SECURITY DEFINER` helper functions callable by anonymous/authenticated users and disabled leaked-password protection. The boolean-returning helpers are referenced by access-control policies, so blindly revoking grants could break RLS; investigate, simulate calls and review a migration in staging before production permission changes.
- **Database:** the advisor also reports missing foreign-key indexes (performance) and five RLS-enabled internal tables without client policies, which may be intentional for service-only resources. Validate actual exposure before altering permissions.
- **Vercel:** production-scoped R2 and Supabase secrets exist, but `MEDIA_WORKER_SECRET` was absent from the visible project variable names; `R2_BUCKET` and `NEXT_PUBLIC_SITE_URL` were not explicitly listed. Canonical URLs now fall back to the Vercel project production URL. Production worker/storage readiness must be verified before release.
- **Moderation:** fixed Admin Reports server page to read Supabase in real mode, matching the Phase 5 report API storage adapter. Actual end-to-end report creation, moderation and rights takedowns in a staging project remain unverified.
- **Release checks:** `npm run release:preflight` validates production configuration without printing secrets; it must be executed with the actual release environment in a protected context.

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
- [ ] Verify Chrome, Firefox, Safari and mobile devices for player visibility and navigation.
- [ ] Audit RTL mix of Latin song titles and Arabic UI, text wrapping, input direction, and back navigation.
- [ ] Accessibility review: WCAG 2.2 AA contrast, focus, ARIA, dynamic status announcements, reduced motion.
- [ ] Verify pages without playable tracks, images or connectivity do not dead-end.
- [ ] Validate cross-language URLs and metadata without redirect loops.

## Gate D — CI and operating discipline

- [x] Keep existing typecheck, unit, production build, lint and RLS checks.
- [ ] Existing full-repository Prettier check must become green; initially 63 paths were reported.
- [ ] Run smoke suite and record results on the final review SHA.
- [ ] Inspect final preview and create a screenshot/video capture checklist for mobile and desktop.
- [ ] Set monitoring: playback start success, buffering time, API errors, 5xx rate, search zero results.
- [ ] Define incident owner, rollback command, fallback banner and release notes.
- [ ] Stage canary rollout; confirm owner approval before production promotion.

## Explicit boundaries

The Phase 6 HTTP smoke test confirms page responses and basic bilingual HTML, **not** touch behavior, playback quality or authorization. Demo-mode tests alone cannot prove production Supabase/R2 reliability. Formatting normalization is review-branch-only. A successful Vercel preview build is not a launch approval. Nothing should be promoted to production until all blocking gates are verified.
