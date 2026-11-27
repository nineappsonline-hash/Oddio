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
| Batch | Focus | Acceptance gate |
|---|---|---|
| 1 — player & foundation | prevent stale audio on track switch, volume control, persistent player, mobile mini/full player, design tokens | no former track audio leaks; volume actually changes; RTL/mobile responsive |
| 2 — navigation & discovery | header, homepage hierarchy, genres, search, keyboard/empty states | search-to-play journey and first-visit discoverability |
| 3 — library | saved music, playlists, queue manipulation, recently played | persisted list order, authorized edits |
| 4 — creators/podcasts | series, episodes, artist profile, Artist Studio upload/management | artist creates series with 3 episodes and publishes |
| 5 — performance & sharing | Cloudflare playback, Supabase queries, OG metadata, E2E, accessibility | real mobile/desktop + AR/EN tests, safe staging release |

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
- [ ] Audit current player regression, fix with unit/E2E tests.
- [ ] Apply validated screen changes only after Figma review.
