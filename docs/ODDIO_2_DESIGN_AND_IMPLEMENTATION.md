# Oddio 2.0 — Approved visual direction & implementation plan

Updated: 2026-11-27 · Status: implementation started · Branch: `feature/oddio-2-foundation`

## Reference priority

The five visual concepts generated in the Oddio project conversation are the visual acceptance references. They are concept images, not production assets; correct their illustrative text, invented content and alignment mistakes while preserving visual quality. Do not substitute flat gray styling.

**Visual contract:** near-black navy background (#09071A), layered plum surfaces (#17102D), luminous purple (#9D5CFF), magenta (#F43DB4), blue (#33B8FF) and warm coral (#FF8557) accents; restrained glass blur, fine translucent borders, 16–20px radii, elevated artwork, Arabic Cairo font in RTL, Inter in LTR, clear contrast and responsive spacing. Use the existing approved Oddio logo and Glossy Gradient Play Loop Logo as the play icon; no white plate behind the logo.

## Image references in conversation archive

1. `a_detailed_ui_screenshot_mockup_a_dark_neon_mus.png` — homepage, sidebar, carousels, bottom player.
2. `a_high_detail_ui_mockup_of_a_music_streaming_web_a.png` — homepage alternative with library sidebar.
3. `a_detailed_ui_mockup_screenshot_of_a_music_streami.png` — compact navigation, podcasts, organized discovery.
4. `a_detailed_mockup_of_a_modern_arabic_music_streami.png` — primary approved homepage reference.
5. `a_high_detail_ui_ux_concept_presentation_collage_f.png` — cross-screen desktop/mobile player, genres, podcasts, artist, mini-player and sharing.

Images are bundled in the handoff archive delivered with this plan. Figma master: https://www.figma.com/design/dyZjofazrdCRAAZvghlLm5

## Delivery stages

| Batch                      | Focus                                                                                                          | Acceptance gate                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1 — player & foundation    | prevent stale audio on track switch, volume control, persistent player, mobile mini/full player, design tokens | no former track audio leaks; volume actually changes; RTL/mobile responsive |
| 2 — navigation & discovery | header, homepage hierarchy, genres, search, keyboard/empty states                                              | search-to-play journey and first-visit discoverability                      |
| 3 — library                | saved music, playlists, queue manipulation, recently played                                                    | persisted list order, authorized edits                                      |
| 4 — creators/podcasts      | series, episodes, artist profile, Artist Studio upload/management                                              | artist creates series with 3 episodes and publishes                         |
| 5 — performance & sharing  | Cloudflare playback, Supabase queries, OG metadata, E2E, accessibility                                         | real mobile/desktop + AR/EN tests, safe staging release                     |

## Non-negotiable safety

- Audit existing features first; do not rebuild working functionality.
- Changes in Figma precede production visual changes; parity checks against concept references.
- Keep Cloudflare streaming, signed URLs, Supabase RLS and current auth intact.
- Never deploy/merge without preview evidence, build, functional & accessibility checks.
- Test actual social preview fetchers rather than relying on client-side metadata.

## Immediate implementation tracking

- [x] Identified source repository and created a dedicated feature branch.
- [x] Saved this design contract and delivery plan alongside existing UX roadmap.
- [x] Created new Figma design file as reference workspace.
- [ ] Reproduce the referenced screens as editable Figma layers and verify visually.
- [x] Audited speculative track warmup and asynchronous crossfade; added a source/next-track continuity guard with four unit cases (tests committed, not yet run).
- [ ] Confirm unit tests, TypeScript and Next.js build on preview CI; verify playback on real browser/device.
- [ ] Apply validated screen changes only after Figma review.

## Implementation update — 2026-11-27

- Extended visual styling in `apps/web/src/app/globals.css` with scoped Oddio 2.0 hero, genre-card, glass and responsive rules.
- Added `isActiveAudioTransition` guard in `audio-transitions.ts`. Applied it to pending speculative authorization and asynchronous `standby.play()` completion in `PlayerProvider.tsx`.
- Added four regression tests to `audio-transitions.test.ts` for active transitions, manual track change, pause/queue replacement, and missing source/target.
- **Verification:** Vercel preview was BUILDING at inspection time, tests not yet confirmed, Figma visual verification blocked by Starter tool call limit. Keep PR as draft and do not deploy to production.

### Player and visual verification update — 2026-11-27

- Preview for `e6901ef` reached READY: Next.js production build completed, but real-device UX/audio QA remains outstanding.
- Corrected volume slider's stale blur write: `PlayerVolumeControl` now commits only after actual input and retains the previous non-zero volume when muted. Volume range and mute state regression tests added to `player-store.test.ts`.
- GitHub Actions CI runs on this draft PR (verify / browser / database). The newest commits still require green checks.
- Dependency audit from Vercel still reports seven moderate and two high issues. Do not assume all vulnerabilities belong to production dependencies; inspect npm advisory details before upgrading.

### CI regression discovered and addressed — 2026-11-27

- GitHub Actions verify for commit `c8a4428` failed at `npm test` (222 of 223 tests passed); specifically `player-store.test.ts` expected `muted=true` when `setVolume(-0.1)` clamped the level to zero.
- Root cause: `setVolume` computed `muted` from raw input (`volume === 0`) instead of the clamped value.
- Fixed `player-store.ts`: clamp finite volumes to [0, 1], normalize non-finite input to 0, and derive `muted` from the normalized number.
- Added coverage for NaN and Infinity, retained tests for clamping, and formatted the changed implementation.
- This corrects a specific testable defect; it does **not** yet verify live media audio output or Figma screenshot parity.
- Follow-up required: green GitHub Actions verify/browser/database on current head, successful Vercel preview, dependency advisory review.
