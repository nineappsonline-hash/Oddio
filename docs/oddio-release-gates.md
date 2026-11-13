# Oddio — Phase 6 Release Readiness & Go/No-Go

**Status: NOT APPROVED FOR PRODUCTION.** This document tracks executable release gates rather than declaring launch readiness. Pull requests #1–#6 form a stacked sequence: each must be reviewed, tested and merged in dependency order.

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
