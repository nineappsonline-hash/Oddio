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
| 0 Baseline & risk audit | IN PROGRESS | Source review started; tests pending |
| 1 Player & Queue | IN PROGRESS | Desktop volume wheel + Queue Undo + Save Queue code committed; browser/CI verification pending |
| 2 Library & Playlists | IN PROGRESS | Pinning, search, sort/view, multi-select and playlist bulk-add coded; new preview QA pending |
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

## Implementation log — 2026-11-20
- Located `apps/web/src/components/player/{PlayerProvider,PlayerBar,PlayerVolumeControl}.tsx`, `apps/web/src/lib/{player-store,player-session,reorder-items}.ts`.
- Verified in code: queue move/reorder methods, next-in-queue, queue restore, dedicated playback retry and volume persistence already exist. Avoid duplicating them.
- **First feature commit:** mouse-wheel volume adjustment when the pointer is over the desktop volume slider, with 5% steps and clamping to 0–100%. Excludes mobile UI. Requires browser regression testing (especially scrolling/trackpads) before release.
- Tests/build were **not run** because this connector provides repository file access, not an executable checkout. No production deployment or merge was performed.
- Next: inspect `FullPlayer.tsx` queue interactions and playlist save APIs; add reversible queue edits and verify with test suite + browser.

### Phase 1 continuation — 2026-11-20
- Implemented one-step queue Undo in the Zustand player store for remove, clear, drag reorder and accessible up/down move. The most recent edit can be undone; playback transitions, playlist replacement and new queue additions invalidate stale snapshots.
- Added an Arabic/English Undo action to the full-player queue header; it stays available even when the list has been cleared.
- Reset queue Undo snapshot during restored listener sessions to avoid cross-session stale edits.
- Added Vitest regression coverage in `apps/web/src/lib/player-store.test.ts` for remove/clear/reorder/advance/invalidation.
- **Validation pending:** Vercel commit status was `pending` at check; GitHub returned no associated PR workflow runs. Tests were committed but not executed in this tool environment. No merge or production deploy.

### Phase 1 continuation — queue saving and interaction polish
- Fixed desktop wheel volume input to use a native **non-passive** wheel listener; React synthetic wheel handlers can be passive in browsers and fail to prevent background scroll.
- Implemented `SaveQueueAsPlaylist`: authenticated listener can enter title, choose private (default) or public, and sequentially save upcoming queue tracks through existing playlist API; duplicates are removed while preserving order. The currently playing track is explicitly excluded.
- Errors are surfaced; a partially created playlist is linked for inspection rather than silently claiming success or retrying duplicate writes. No bulk atomic playlist API exists yet; API-level transactional saves remain a future improvement.
- Added action to full-player queue toolbar with responsive wrapping. Adjusted full-player Escape/Tab handler to yield to nested portaled dialog.
- Pending validation: build/typecheck/unit and end-to-end tests including keyboard focus, network failures, RTL and private playlist permissions. No production merge.

### Phase 2 start — Library browsing improvements (2026-11-20)
- Audited existing Library server page, liked-track ordering, owned/followed playlist shelves and playlist-track reorder API. Existing drag/drop and browser-local manual ordering were retained rather than rebuilt.
- Added in-library playlist search by title, owner and description; My order/Name/Newest sorts; Grid/List view toggle with device-local preference saved independently for owned/followed shelves.
- Search and non-manual sort explicitly disable drag reordering to prevent moving hidden items or corrupting manual-order state.
- Added instant liked-track search by title or artist across recent/title/popular/custom views, including an empty-results state and matching queue playback order.
- This phase is **partially implemented**, not released: pinning, multi-select/bulk actions, server-persisted shelf order, and detailed playlist management remain pending. Existing shelf preferences are stored on the current device only.
- Latest Vercel preview for these commits is BUILDING; no browser, lint, typecheck or unit-suite confirmation yet. No merge or production release.

### Phase 2 continuation — pinning and bulk queue actions
- Diagnosed a **real Vercel compile failure** (unterminated JSX conditional) in `apps/web/src/app/[locale]/library/page.tsx`; corrected the missing closing `}` in commit `ebeca6d6`. Earlier preview deployments reporting ERROR are not eligible for release.
- Added per-listener, per-shelf **Pin/Unpin** for owned and followed playlists. Pinned entries sort to the top and are persisted via browser localStorage; pin order is intentionally device-only. Manual drag is disabled while pins exist to prevent unexpected reorder results; unpin to restore custom sorting.
- Added **Select visible / Deselect visible** and **Add selected to queue** on liked-song search results. Bulk queue action only affects the local player queue, and intentionally does not touch liked-song or playlist membership server-side.
- Unfinished: multi-select in custom liked-song ordering, bulk playlist mutations, cross-device pinned state, authoritative E2E and accessibility testing.
- Build for the latest commits was still in progress at last observation. Retain production isolation until a passing preview and browser QA are available.

### Phase 2 continuation — bulk additions to playlists
- Confirmed the previous corrected preview commit `a7d73eec` reached **Vercel READY**; this confirms the build, not end-to-end behavior.
- Added `BulkAddToPlaylistButton` to select an existing editable playlist and add a user's selected liked songs using the existing authenticated, same-origin playlist-track POST endpoint. Previously present tracks are skipped, duplicate selections are removed, and requests run sequentially to preserve order.
- Added the bulk action to both ordinary liked-song search and custom-order liked-song view. Custom-order liked songs also gained visible-item selection and bulk add-to-queue.
- Partial server failures surface a count and a link to review the playlist; automatic retries are deliberately disabled because prior writes might have succeeded.
- **Remaining:** atomic bulk add API with idempotency/concurrency, bulk removals with explicit confirmation/undo, cross-device settings, and browser-level accessibility/RTL tests.
- Most recent deployment for new additions was BUILDING at last check, so it has NOT been released to production.

### Phase 2 continuation — bulk removal from editable playlists
- Added checkbox selection, Select All/Clear Selection, and explicit two-step removal confirmation in `PlaylistReorderableTracks`. Only rendered for editable playlists as already controlled by the server playlist page.
- Deletion uses the existing same-origin, authenticated and authorized `DELETE /api/playlists/:id/tracks/:trackId` endpoint sequentially; a playlist track is not deleted from the Oddio catalog.
- A successful operation updates the local playlist and refreshes server-rendered metadata. Partial failures display exact completed/attempted counts and **block further edits until the page is reloaded**. No automatic retry or false rollback claims; bulk deletion is not atomic, and immediate server-side undo is not yet supported.
- While confirmation is open or a deletion runs, drag-reorder is locked to avoid conflicting mutations.
- Latest earlier previews for the previous implementation had reached READY, but these new removal changes still require current-commit build verification and manual browser QA. Production remains unchanged.

### Phase 2 reliability pass — 2026-11-20
- Confirmed the previous phase-2 preview commit `699f964a` is **Vercel READY**. This establishes a successful build, not verified browser behavior.
- Added a shared sequential mutation runner, `apps/web/src/lib/sequential-playlist-mutations.ts`, with Vitest cases for ordered completion, stopped-on-first-error behavior, progress callbacks and empty selection.
- Wired playlist bulk removal and liked-song bulk add-to-playlist through that runner, including visible completed/total counters. When a request fails, the UI treats its server outcome as **unknown**, since a lost response may follow a committed write. It does not retry automatically.
- The bulk-removal UI blocks editing until authoritative playlist state is reloaded after an interruption. A bulk-add interruption links to the playlist for review.
- **Verification remaining:** new commits' Vercel build completion, execution of Vitest, real browser confirmation on mobile/desktop and audit of DB-level idempotent batch APIs. This feature branch is not merged into production.

### Phase 3 start — search UX (2026-11-20)
- Verified latest Phase 2 commit `029a8a12` is Vercel **READY**. This is a successful preview build, not a claim of passing unit or end-to-end tests.
- Audited existing server-side catalog search: bilingual Arabic/English normalization, typo tolerance, relevance, genres/moods/language filters and pagination already existed and were retained.
- Added `SearchExperience` to the catalog search page: recent searches (maximum 8), one-click repeat/remove/clear, accessible search field and / or Ctrl/Cmd+K focus shortcut. Searches are saved **only after an explicit user search**, not on every keystroke. Signed-in listener terms are namespaced by account ID in localStorage; guests use sessionStorage to avoid persistent guest history.
- Added visible active-search filter chips and Clear All shortcut. Existing advanced filters remain available.
- Added pure helper and Vitest tests for history deduplication, size limits, blank terms and corrupted storage. No online search or personalized external data sharing introduced.
- **QA pending:** new commits' Vercel preview BUILDING at last check; run the new Vitest suite, keyboard/mobile/RTL flows, session switching, browser storage disabled and advanced-filter interactions before production merge.

### Phase 3 continuation — live search suggestions
- Added `GET /api/search/suggestions?q=...` with a **small** projection (up to 5 tracks and 3 artists) built from the existing `searchCatalog` visibility/release-aware query and the listener's content-language preference. Invalid or short terms fail safely; no raw database objects are returned.
- Added a 260ms debounced, abortable suggestion request while the search input is focused and has at least two characters. Displays tracks and artists as direct links; supports normal Enter search and a link to all results. Loading/error/empty states are localized; errors do not block ordinary search.
- Existing recent-search history, keyboard shortcuts and explicit-submit semantics remain. New requests use the current user session's permission-aware catalog.
- **Verification:** earlier Phase 3 preview `2d3cac46` is Vercel READY; latest autocomplete commits are still BUILDING at last check. Browser keyboard/RTL/mobile testing and tests for this endpoint remain open. Do not merge to production without successful preview and QA.

- Follow-up Phase 3 safety regression: extracted a minimal `projectSearchSuggestions` response mapper and added Vitest cases for field allowlisting and rejection of another listener's private track in suggestion results. These are committed tests; their execution is not yet confirmed. The live API now uses this projection.

### Phase 3 continuation — keyboard suggestions and zero-results recovery
- Confirmed autocomplete privacy-test preview `6b40a7ae` is Vercel READY. This proves successful compilation but does not mean browser UX or unit tests have run.
- Search suggestion links now support ArrowDown/ArrowUp focus traversal with movement back into the query input; Escape closes suggestions. Mouse and Tab links remain ordinary anchors. Added a pure focus-boundary helper and Vitest regression cases (committed; run status pending).
- Zero-results UI now offers helpful guidance (fewer words, remove filters), a link to retry the same query without genre/mood/language filters, and direct links to up to six active genres from the current visible catalog. No invented popular terms or unverified content counts.
- Latest implementation builds are pending. Pending QA: mobile tap behavior, keyboard screen-reader flow, RTL focus transitions, no-result URL navigation, unit tests, and release review. Production unchanged.

### Phase 3 mobile / RTL accessibility pass — 2026-11-20
- Verified preceding Phase 3 commit `5a33f510` reached Vercel **READY** (compilation succeeded; browser acceptance not yet established).
- Fixed an autocomplete keyboard gap: artist suggestions now carry the same `data-suggestion-link` marker as track suggestions and are included in ArrowUp/ArrowDown traversal. Clicking an artist suggestion records search history and closes the panel consistently.
- Added explicit RTL direction to the self-contained search interaction; restrained the suggestion list to 55dvh / 400px maximum, enabled contained scrolling and touch-sized controls, and tightened the small-screen search button to prevent horizontal overflow.
- Updated blur handling to defer dismissal for 180ms when a touch/mouse focus transition has no reliable `relatedTarget`; this is a best-effort fix to allow suggestion taps to activate, and still needs live mobile browser testing (including VoiceOver/TalkBack and soft keyboard).
- No production merge or publication. New commits require current preview READY and hands-on QA before release.
