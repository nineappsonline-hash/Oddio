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
- [ ] Validate range streaming, buffering, token renewal and permission errors on real audio.
- [ ] Persist/restore queue safely, including unavailable items and refresh.
- [ ] Protect against duplicate playback events and lost favorite writes.
- [ ] Add observability for play success, first-audio latency, buffering and crashes.
Exit gate: playback success and recovery budgets met in real test sessions.

## Phase 3 — Search, library, discovery
- [ ] Accent-insensitive Arabic/English search; Arabic spelling variants.
- [ ] Search filters, zero-state, clear feedback and recent searches with privacy controls.
- [ ] Library sorting, bulk actions, undo, removal explanations and duplicate handling.
- [ ] Transparent preference controls, hide/unlike feedback and diversity limits.
- [ ] Algorithmic Daily Flow only after sufficient consented signals.
Exit gate: validated task completion and search success benchmarks.

## Phase 4 — Distinctive AI-first identity
- [ ] Artist Worlds with identity, music, credits and clearly labeled AI provenance.
- [ ] Taste Dial (familiar to surprising) with predictable, explainable outputs.
- [ ] Soundspace and distraction-free listening, with reduced motion support.
- [ ] Mood Shift and Explain My Mix, initially deterministic before advanced recommendations.
Exit gate: demonstrate improvements to discovery without deceptive AI claims.

## Phase 5 — Trust, creators, growth
- [ ] Track versioning, fingerprint/dedup, takedown and appeal process.
- [ ] Consent for real-person likeness/voice and evidence retention policy.
- [ ] Abuse prevention, creator trust, rights audit trails and editorial integrity.
- [ ] Responsible reporting, data deletion/export and account recoverability.
- [ ] Analytics privacy, rate limits, cost controls and backup restore drills.

## Phase 6 — Release and measurement
- [ ] Responsive, RTL, keyboard and screen-reader E2E test matrix.
- [ ] Production-like canary / preview testing before rollout.
- [ ] Success metrics: play starts, playback failures, search success, save reliability, day-7 return.
- [ ] Rollback and incident response procedures.
- [ ] Promote to production only after explicit release checks.

## Important safeguards
This initial UI PR **does not** switch production databases, alter rights/consent rules, migrate data, enable premium billing, or promise features not implemented.
Changes are isolated to a review branch; a preview is not production release.
