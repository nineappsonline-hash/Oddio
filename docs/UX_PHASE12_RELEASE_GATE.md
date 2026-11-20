# Oddio — Phase 12 release and rollback gate

**Status:** NO-GO for production until all blocking items are verified.
**Working branch:** `feature/ux-roadmap-2026`
**Production:** unchanged by the UX roadmap.
**Evidence window:** 2026-11-21. These are engineering checks, not claims of a completed real-device or production test.

## Required release evidence

| Gate                     | Minimum acceptance                                                                                                                                                            | Current evidence                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Same-SHA CI              | `verify`, `database` and `browser` jobs must all be green on the exact release commit                                                                                         | **Pending:** older runs were mixed or action-required; a Vercel READY result does not replace them.  |
| Production-like Supabase | Apply all pending migrations to **isolated staging**; test an authorized and unauthorized account, RLS, collaborator invite/revoke, Smart Playlist account sync and reconnect | **Blocked:** no separate validated staging project; never apply unreviewed migrations to production. |
| Media access             | Actual R2 audio plays/seeks on Chrome, Safari/iOS, Firefox, Arabic and English; expired/denied URLs cannot be reused; redirects/errors are `no-store`                         | Source-level guards and tests added; real R2 end-to-end and mobile QA pending.                       |
| Playback reliability     | Next/previous/shuffle, queue reorder, retry, expired signed URL refresh and network recovery; no duplicate qualified playback events                                          | Demo browser smoke exists; real device/network QA pending.                                           |
| Rewind privacy           | Signed-in only; no auto-share; at least five qualified listens before export; optional fields off by default; generated PNG uses local browser Canvas only                    | Code and unit tests added; actual iOS download and native sharing QA pending.                        |
| Accessibility            | 320px/390px/desktop, AR RTL/EN, tab/arrow/Escape, focus, contrast, zoom 200%, reduced motion, spoken labels                                                                   | Selected browser checks exist; complete WCAG 2.2 AA-oriented audit pending.                          |
| Performance              | Measure Lighthouse mobile/desktop + Core Web Vitals on representative slow network and catalog size; check image requests, player start time and buffering                    | Lazy/async decoded catalog artwork added; **no defensible metrics yet**, so no success claim.        |
| Privacy & telemetry      | Consent-safe time-to-first-play, buffering, failure-rate and search-to-play measurements; no sensitive queries, tokens or raw listener IDs in client analytics                | Instrumentation/retention review pending.                                                            |
| Migrations & operations  | Backup/restore drill, tested rollback runbook, alerting for playback failure and auth, clear owner for deploy                                                                 | Not yet evidenced.                                                                                   |

## Performance / reliability changes in this branch

- Catalog artwork rendered as native lazy-loaded `<img loading="lazy" decoding="async">` with preserved placeholder/fallback instead of eager CSS URL backgrounds. Measure LCP and any artwork regressions before release.
- Stream redirects and all protected/error responses specify private `no-store` cache semantics. Signed R2 links must never be stored for longer than their expiry. Range rejections also forbid caching.
- Rewind monthly timeline counts recorded qualified events only; no fabricated minutes. A minimum five-qualifying-listen guard disables share/PNG for insufficient history. PNG is generated locally with user-selected fields.
- Browser smoke covers anonymous Rewind route redirects and authenticated Rewind empty state; verify both Arabic and English behavior and mobile overflow.

## Deployment decision

**NO-GO** until every required production-relevant gate above has evidence on the **same feature-branch SHA**. Do not merge or promote on Vercel `READY` alone.

1. Complete green CI on one commit; fix remaining browser, unit, format and SQL issues without disabling checks.
2. Establish an isolated staging DB/app, apply reviewed migrations there, and exercise two real test users plus R2 playback.
3. Record baseline versus candidate first-play latency, buffering, mobile Lighthouse, accessibility and failure rates.
4. Run a limited release behind feature flags where supported; compare to baseline. If critical errors or latency regress, roll back the deployment and do not revert or destroy production user data.
5. Release to production **only after the user explicitly approves**. Never modify the live database as a side effect of checking release readiness.

## Rollback outline

- Keep the last known-good production deployment and its configuration available for immediate Vercel rollback.
- Database changes require reviewed backward-compatible migrations; do not assume a schema rollback is safe once live records exist.
- Disable newly enabled flags and revert code deployment if auth, playback authorization, persistent queue/playlist editing, or privacy checks regress.
- After rollback, verify login, a public stream, a private-stream denial, playlist reads, and user account isolation.

## Phase 12 QA follow-up — 2026-11-21

- Latest complete preview build before this check was `d1426ef0` **READY**, but its CI run was `action_required`. Previous code-level CI run `a9eca7f0` passed database tests but failed Prettier on six touched files and browser smoke reported **55/57**: desktop Arabic Rewind mobile-resize overflow by 154px and intermittent liked-songs pointer drag order.
- Current branch constrains Rewind main/stat grids to the mobile viewport, permits Arabic labels to wrap, and adds a browser diagnostic reporting overflowing DOM elements if the overflow persists. Pointer drag smoke now targets the center of the intended list row and waits for the reorder to commit instead of assuming synchronous pointer state.
- The scoped formatter has been triggered again (`44829307116`). All these changes are awaiting a **single same-SHA** full CI green run. Earlier mixed successes do not satisfy this gate.
- Production promotion remains **NO-GO**, pending complete CI acceptance, real R2 playback, dedicated staging migrations, mobile iOS/Android testing, and performance baselines. No production database changes.
