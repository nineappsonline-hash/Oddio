# Oddio UX Development Roadmap — 2026

**Status:** In progress. **Owner:** Product / Engineering. **Target:** Responsive web, EN + AR (RTL).  
**Working branch:** `feature/ux-roadmap-2026`. **Production:** no deployment or merge without functional, accessibility, security and data-persistence checks.

## Ground rules
- Audit the actual implementation before making a feature; **do not rebuild shipped features**. README currently documents persistent player, queue, shuffle/repeat, keyboard support, search, moods, playlists, follows, OG sharing, localized routes and artist pages. Verify live behavior rather than assume all are complete.
- Respect playback access rules, signed streaming URLs, R2, user privacy, server-side permissions and Supabase RLS.
- README warns not to merge development changes into production until production social/playlist persistence, migrations and authenticated R2 streaming pass testing.
- For every change: mobile + desktop, EN + AR/RTL, mouse + keyboard + touch, loading + empty + error, optimistic interaction + server persistence, and regression tests.
- Every phase ships a demo, test evidence, QA checklist, and a release decision. Measure impact before proceeding.

## Phase 0 — Baseline & risk audit (P0; FIRST)
1. Inventory player, queue, search, library, playlist, profile, artist, album, mobile navigation, APIs and Supabase migrations; mark **working / partially working / missing / blocked**.
2. Run build, typecheck, lint, unit tests, Supabase RLS tests, and authenticated stream tests in staging.
3. Instrument events with consent/privacy safeguards: time-to-first-play, play errors, buffering, search-to-play, 7-day retention, songs/session, playlist adds, skips, mobile task completion. Do not log full sensitive search strings or signed media URLs.
4. Record representative journeys: anonymous first play; signed-in playlist creation; RTL search; mobile queue reorder; return after navigation; failed media recovery.
**Exit:** evidence-backed gap inventory, test baseline, and approved scope for Phase 1.

## Phase 1 — Frictionless listening: Player & Queue (P0)
- Preserve playback across page changes; resume last position when user chooses to resume; clear state on logout/account switch as appropriate.
- Define click/double-click semantics consistently (single select only in multi-select surfaces, double-click play on desktop; one-tap play for mobile).
- Explicit Play now / Play next / Add to queue; source attribution; queue history and save queue as playlist.
- Drag and drop on desktop and accessible move-up/down fallback; touch-friendly reorder; keyboard shortcuts with focus safeguards.
- Undo queue remove/clear/reorder; robust shuffle without premature repeats; track/list/none repeat.
- Readable current track, seek, elapsed/remaining toggle, pointer-wheel volume on desktop with sensible bounds, persistent per-user preferences.
- Loading/buffering/offline/error feedback; retry unavailable tracks without collapsing queue; signed URL refresh, no unauthorized access.
**Acceptance:** navigation uninterrupted; queue actions persist according to defined session policy; no duplicated events; E2E tests for desktop/mobile/RTL and error recovery.

## Phase 2 — Library & playlists (P0)
- Library filters Songs/Albums/Artists/Playlists, sort by recent/name/played, view toggle, quick library search, pinned items.
- Multi-select and bulk move/add/remove with undo, keyboard support and confirmation for destructive operations.
- Playlist cover, description, visibility, duplicate, follow, share, track add/move, drag-sort (mouse/touch/keyboard), stable order saved transactionally and authorized by owner.
- Empty states and optimistic status messages.
**Acceptance:** refresh/device changes preserve playlist order; private entries remain private; no lost updates on concurrent reorders.

## Phase 3 — Search & navigation (P0)
- Low-latency suggestions, recents (opt-in as appropriate), corrected typo suggestions, categorized Top/Songs/Artists/Albums/Playlists, direct play.
- Search by name, artist, lyrics where licensed/indexed, language, mood and genre; scoped filters.
- Plan semantic retrieval after quality evaluation; fall back to lexical search; preserve access/visibility filtering.
**Acceptance:** measured search-to-play success, keyboard ARIA combobox support, RTL and no-result UX.

## Phase 4 — Mobile-first polish & accessibility (P0)
- Home/Search/Library bottom navigation; compact persistent mini-player, full-screen player with large touch targets and reachable controls.
- Gesture discovery with explicit accessible alternatives; swipe up/down player; long-press context actions.
- Screen reader semantics, focus management, keyboard shortcuts, reduced motion, contrast and text scaling; responsive layout across breakpoints.
- Context menus and consistent actions for songs/albums/playlists; skeleton, empty, slow, offline and error states.
**Acceptance:** complete common tasks on small phones and desktops, WCAG 2.2 AA-oriented audit and RTL layout review.

## Phase 5 — Personalization & home (P1)
- Optional first-run choose three artists/genres; non-personalized fallback for new/anonymous users.
- Continue Listening, Recently Played, Made For You, favorites, new follows, trending/new/editor picks.
- Explainable home ranking with control over personalization and ability to reset preferences.
**Acceptance:** meaningful content for users with zero history; explicit privacy and opt-out.

## Phase 6 — Discovery, radio & weekly mixes (P1)
- Song/Artist/Genre Radio with mood, energy, tempo and genre matching; exploration controls.
- Weekly discovery playlist (20 candidates when catalog permits), exclusions for already played/blocked and deterministic regeneration rules.
- Mood discovery: Focus, Late Night, Energy Boost, Heartbroken, Dreamy, Workout, Chill, Road Trip.
**Acceptance:** no inaccessible tracks in generated results; novelty/relevance metrics; graceful small-catalog fallback.

## Phase 7 — Artist/album depth (P1)
- Artist hero, follow, top songs, discography, singles, appearances, similar artists, radio.
- Album metadata, play/shuffle/save/share, duration, release year, related albums; robust empty states.
- Transparently distinguish AI persona from factual human biography and creator attribution where available.
**Acceptance:** correct visibility, linked navigation and complete mobile layouts.

## Phase 8 — Smart playlists & taste profile (P2)
- Saved auto-updating playlist rules for language, genre, liked, etc. with preview and query bounds.
- User listening dashboard: top genres, artists, patterns, most-played, discoveries, opt-out/reset.
**Acceptance:** correct privacy, incremental updates, no leaking listening history.

## Phase 9 — Oddio-native AI discovery & Music DNA (P2)
- Natural-language catalog search such as "80s synthwave with Arabic vocals" using search/indexed metadata; explain matches, no hallucinated titles.
- Energy, mood, tempo/BPM, language, vocal and genre facets displayed only when confidently measured/tagged; provenance and correction controls.
**Acceptance:** offline relevance evaluation, factual metadata standards, performance and cost guardrails.

## Phase 10 — Social sharing & collaborative experiences (P2)
- Public user follows where explicitly chosen; collaborative playlist roles and invitation revoke; attribution and edit conflict behavior.
- Share cards with branded OG images, deep links, social preview validation.
- Abuse reporting, moderation, privacy and authorization tests.
**Acceptance:** invite-only access verified end-to-end; no exposure of private libraries.

## Phase 11 — Yearly recap (P3)
- Oddio Wrapped: listening time, top song/artist, favorite genre, most active month, new discoveries and shareable cards.
- Transparent calculation period, minimum-sample fallback, user privacy and opt-out.

## Phase 12 — Cross-cutting performance, reliability and release
- Fast startup, controlled next-track preloading, optimized covers (AVIF/WebP), lazy loading, virtualization as needed, client caching.
- Never cache signed R2 URLs beyond expiry; handle refresh and access revocation safely.
- Verify Lighthouse/Core Web Vitals, real-user buffering rate, accessibility, security, localization and regression suites.
- Roll out behind flags where needed; compare metrics to baseline, monitor failures and roll back on regression.

## Phase tracking
| Phase | State | Gate |
|---|---|---|
| 0 Baseline & risk audit | IN PROGRESS | Inventory and test evidence |
| 1 Player & Queue | NOT STARTED | E2E + persistence |
| 2 Library & Playlists | NOT STARTED | Authorized saved ordering |
| 3 Search | NOT STARTED | Search-to-play measurement |
| 4 Mobile & Accessibility | NOT STARTED | Cross-device QA |
| 5 Personalized Home | NOT STARTED | Privacy / cold start |
| 6 Radio & Weekly | NOT STARTED | Recommendation quality |
| 7 Artists & Albums | NOT STARTED | Data correctness |
| 8 Smart Playlists & Taste | NOT STARTED | Rules/privacy |
| 9 AI Search & DNA | NOT STARTED | Retrieval/metadata quality |
| 10 Social | NOT STARTED | Permissions/moderation |
| 11 Wrapped | NOT STARTED | Analytics correctness |
| 12 Performance & rollout | NOT STARTED | Benchmarks/release gates |

## Initial audit observations (from repo README only, not browser-confirmed)
- Existing foundations already documented: locale routing and RTL, persistent player and queue with shuffle/repeat/seek/fullscreen/keyboard, discovery/search, social/playlist flows, artist and album pages, sharing and audio-range streaming.
- Production data path is described as incomplete for some social and playlist mutations; treat drag-sort persistence as a correctness/security task, not merely a UI task.
- R2 authenticated streaming and development-branch migration gates are explicitly flagged as unresolved. Production must remain unaffected pending validation.
- Next investigation: read the actual player/queue components and state store, playlist mutation APIs and Supabase adapter before editing interactions.
