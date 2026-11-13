# Oddio — Master Plan Implementation Tracker

Status: **in progress**. Product source: EchoPlay Master Plan v1.1, adapted for the actual **Oddio** brand and repository. This tracker is not a claim that all roadmap features are delivered.

## Non-negotiable product principles

- Music-first: direct play, persistent controls, minimal distractions.
- AI-only music with human moderation, licensing and consent disclosures.
- Fully supported Arabic RTL and English LTR.
- Accessible interaction targets, focus states and reduced-motion support.
- Never copy visual assets, trademarks, or distinctive layouts from competitors.
- Preserve guest listening and free, ad-free positioning unless the product owner changes policy.

## Phase 0 — Architecture and production-readiness audit (BLOCKING)

- [x] Identify the actual Oddio repo and Vercel deployment.
- [x] Verify existing routes, player, studio, admin and Supabase adapter.
- [ ] Confirm Vercel environment settings without revealing secrets.
- [ ] Verify production database schema, seed, storage and RLS against a staging project.
- [ ] Run typecheck, lint, unit tests, RLS tests and end-to-end tests.
- [ ] Review signed stream responses, abuse controls, authentication, quotas and content consent.
- [ ] Resolve contradictory production notes around demo JSON versus Supabase.
      Exit gate: secure persistence and cross-instance behavior verified in staging.

## Phase 1 — Music-first design foundation

- [x] Introduce branded Obsidian/Oxblood/Copper color tokens.
- [x] Give the homepage a playable Soundspace presentation with artwork.
- [x] Respect current locale in a homepage track link.
- [x] Extend keyboard focus and reduced-motion fallback.
- [ ] Audit contrast, mobile ergonomics, labels and touch sizes on rendered browser views.
- [ ] Apply cohesive tokens to player, search, library, studio and admin in iterative PRs.
- [ ] User-test navigation and first-play success.

## Phase 2 — Reliable core playback

- [x] Preserve tab-scoped queue, current track and playback preferences with validation; restore paused.
- [x] Add retry authorization for failed playback in mini and expanded players.
- [x] Only send a playback-start event after the audio element begins playing.
- [x] Separate saved player sessions per signed-in listener / guest.
- [ ] Integration-test refresh restoration, expired stream tokens, unavailable tracks and multiple tabs.
- [ ] Validate range streaming, buffering, token renewal and permission errors on real audio.
- [ ] Persist/restore queue safely, including unavailable items and refresh.
- [ ] Protect against duplicate playback events and lost favorite writes.
- [ ] Add observability for play success, first-audio latency, buffering and crashes.
      Exit gate: playback success and recovery budgets met in real test sessions.

## Phase 3 — Search, library, discovery

- [x] Search Arabic with normalized hamza, diacritics and alef/ya forms; normalize Latin accents.
- [x] Rank matching tracks by normalized exact/title/artist relevance before plays.
- [x] Wire Search, Discover and Library to the configured Supabase snapshot in non-demo mode.
- [x] Add discover query input, search/discover pagination and locale-preserving links.
- [x] Add library section navigation and liked-song sorting by name or popularity.
- [ ] Verify production data adapters in a staging database and conduct real search usability tests.
- [ ] Implement intentional transliteration aliases from catalog metadata; avoid guessing personal names.
- [ ] Build proper search indexes and targeted DB queries before significant traffic.
- [ ] Accent-insensitive Arabic/English search; Arabic spelling variants.
- [ ] Search filters, zero-state, clear feedback and recent searches with privacy controls.
- [ ] Library sorting, bulk actions, undo, removal explanations and duplicate handling.
- [ ] Transparent preference controls, hide/unlike feedback and diversity limits.
- [ ] Algorithmic Daily Flow only after sufficient consented signals.
      Exit gate: validated task completion and search success benchmarks.

## Phase 4 — Distinctive AI-first identity

- [x] Launch a separate bilingual Soundspace route with Mood Shift and a three-level Taste Dial.
- [x] Build deterministic, testable music selection with per-artist diversity and visible reason labels; no claim of trained personalized AI.
- [x] Offer a low-distraction view without removing the persistent playback controls.
- [x] Build first Artist Worlds upgrade with genres, AI-production transparency and artist biography.
- [x] Surface Soundspace from home, desktop navigation and mobile navigation.
- [ ] Improve recommendation reasons to be specific to each track/mood signal and add user-controlled feedback.
- [ ] Persist opt-in taste preferences per account after database/privacy review.
- [ ] Measure usability on Arabic and English mobile/desktop and test with real artists/tracks.
- [ ] Artist Worlds with identity, music, credits and clearly labeled AI provenance.
- [ ] Taste Dial (familiar to surprising) with predictable, explainable outputs.
- [ ] Soundspace and distraction-free listening, with reduced motion support.
- [ ] Mood Shift and Explain My Mix, initially deterministic before advanced recommendations.
      Exit gate: demonstrate improvements to discovery without deceptive AI claims.

## Phase 5 — Trust, creators, growth

- [x] Require rights and voice/likeness consent declarations on demo and production upload paths; write audit actions for submission.
- [x] Reject exact duplicate uploaded audio hashes, with existing production R2 hash verification retained.
- [x] Route report creation and moderation closure through Supabase snapshots outside demo mode.
- [x] Validate report targets and visibility, avoid duplicate active reports, and audit report submissions.
- [x] Require meaningful explanations for track rejection/changes and report resolution; prevent re-closing cases.
- [x] Add unit tests for rights declarations and moderation safety behavior.
- [ ] Conduct independent license, voice-consent and takedown evidence review; a checkbox is not legal proof.
- [ ] Add perceptual audio fingerprints, near-duplicate triage and appeal workflow (exact SHA-256 is not perceptual matching).
- [ ] Introduce transactional/idempotent moderation writes and indexed reporting queries before production scale.
- [ ] Verify stored audit records and report lifecycle end-to-end in a staging Supabase project.
- [ ] Track versioning, fingerprint/dedup, takedown and appeal process.
- [ ] Consent for real-person likeness/voice and evidence retention policy.
- [ ] Abuse prevention, creator trust, rights audit trails and editorial integrity.
- [ ] Responsible reporting, data deletion/export and account recoverability.
- [ ] Analytics privacy, rate limits, cost controls and backup restore drills.

## Phase 6 — Release and measurement

- [x] Add Node HTTP bilingual release smoke suite and wire it into CI after the Next production build.
- [x] Serve Sitemap from Supabase when not in demo mode and list Soundspace.
- [x] Improve error recovery localization, loading-state accessibility and focus contrast.
- [x] Create explicit launch Go/No-Go security, playback, UX, operational gates in docs/oddio-release-gates.md.
- [ ] Verify full-repository Prettier formatting normalization and get green format check (63 pre-existing violations in last audit).
- [ ] Verify real-browser E2E and external production service integration before merge.
- [ ] Responsive, RTL, keyboard and screen-reader E2E test matrix.
- [ ] Production-like canary / preview testing before rollout.
- [ ] Success metrics: play starts, playback failures, search success, save reliability, day-7 return.
- [ ] Rollback and incident response procedures.
- [ ] Promote to production only after explicit release checks.

## Important safeguards

This initial UI PR **does not** switch production databases, alter rights/consent rules, migrate data, enable premium billing, or promise features not implemented.
Changes are isolated to a review branch; a preview is not production release.
