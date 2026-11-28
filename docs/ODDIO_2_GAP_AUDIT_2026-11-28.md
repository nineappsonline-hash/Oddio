# Oddio 2.0 — current gap analysis and release gates (28 November 2026)

**Source of truth:** latest production branch `main` at `950d33b2155e87c3e56905a8aab99cf9d436780a`. This assessment supersedes historical checkboxes in `ODDIO_2_DESIGN_AND_IMPLEMENTATION.md` where later code shipped. It does **not** assert that preview smoke tests prove real production systems.

## What already exists in main

| Oddio 2.0 stage         | Current implementation evidence                                                                                                                                                                    | Still blocking acceptance                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Player/foundation    | Persistent shell, queue, timed/plain lyrics, mobile compact player, fast full-player expansion, transition guards and audio tests. Matte-black / deep-petrol palette and MagicPath layout shipped. | Actual signed R2 playback/expiry, iPhone/Android background/recovery, real speaker volume, failed-network handling.                                                                   |
| 2. Navigation/discovery | Arabic/English home/search/discover/genres/artists; persistent mini-player, active navigation, keyboard/browser smoke, bilingual catalog descriptions.                                             | Live catalog first-play/search-to-play completion and screen-reader/zoom/touch acceptance with real users.                                                                            |
| 3. Library              | Likes, playlist ordering and editing, private recap/rewind, Smart Playlists and conflict-safe account sync with demo/fixture tests.                                                                | Two disposable real Supabase accounts editing/reconnecting concurrently, including offline conflicts.                                                                                 |
| 4. Creators/podcasts    | Podcast categories, series/shows/episodes, creator permissions, studio tools, moderation endpoints, episode/player controls and public metadata.                                                   | Disposable creator publishes one show with **three** verified episodes through real Supabase and direct R2, editor review, RLS checks, published/unpublished visibility, audio seeks. |
| 5. Performance/sharing  | CI verify/browser/database, OG metadata and dynamic image renderer, sitemap/robots, bilingual metadata, accessibility and mobile smoke tests.                                                      | Real social crawlers and shared cover preview, physical-device Safari/Android, signed storage, release preflight, backup/rollback, owner visual signoff.                              |

The old visual-contract section refers to **historical neon concepts**. The owner's latest approved palette is **matte black + deep petrol blue + white**, based on the MagicPath composition. Do not restore purple/sky-blue styling from the earlier plan.

## Implementation completed in this review branch

- Branch `feature/oddio-final-release-gates` is based on latest `main`, **not** the diverged Oddio 2.0 branch. It preserves recent fixes to Story, Rewind, podcasts, playback and SEO.
- `scripts/social-preview-smoke.mjs`: use a Facebook/WhatsApp-style link crawler agent, require server-rendered Arabic/English OG and X/Twitter metadata on home, podcasts and sample song pages, verify canonical image URL, 1200×630 dimensions and actual `image/png` bytes from the first-party endpoint. Supports extra real published show/episode paths for staging.
- CI invokes this after starting the built Next server in isolated demo mode.
- Existing Story-clip audio-end browser smoke retains the recovery assertion but allows for CI WebKit scheduling delays. This resolves a timeout observed in the latest `main` CI (all three core browser suites had passed, then one Story end-event check timed out).

## Release Go/No-Go: evidence still required

1. **Real media:** with a test track and test episode, validate direct signed Cloudflare R2 URLs, byte range `206`, token expiry, seek, no first-second audio leaks, volume/mute and queue across navigation on iPhone Safari and Android Chrome.
2. **Creator flow:** artist account creates a named podcast series, adds three episodes using actual private R2 uploads, submits for review, staff approves, anonymous listener sees only published episodes, and draft/private audio cannot be accessed directly. Confirm rights/consent and audits.
3. **Real sync/security:** two isolated user accounts and two devices; verify Supabase RLS, saved list ordering, stale revision conflict and account switch without leaking previous queue/library.
4. **Social:** run against staging with real published URLs: `SMOKE_BASE_URL=https://<staging-host> node scripts/social-preview-smoke.mjs /ar/podcasts/shows/<slug> /ar/podcasts/episodes/<uuid> /en/podcasts/shows/<slug>`. Also paste live links into WhatsApp, Telegram, Facebook and X, and inspect actual previews. Bot cache/robots and external CDN availability are not certified by the local smoke.
5. **Accessibility/performance:** check actual mobile 320–430px layouts and 200% zoom, keyboard focus/voiceover/screen-reader, AR/EN bidi, CLS/LCP, footer/mini-player overlap and network throttling. Compare to the owner's current MagicPath revision.
6. **Release:** latest exact commit must pass verify/browser/database + build and preview; check Vercel production secret _presence_ without revealing values, schema migrations/storage/CORS in the correct projects, monitor errors, rehearse rollback, obtain owner approval. **No production merge/deploy until all required gates pass.**

## What automated CI does not prove

- The demo podcast catalog intentionally includes **no published shows**. Its home page can pass metadata checks while real show/episode share cards remain unverified.
- Synthesized MP3 and local Playwright cannot establish actual Cloudflare worker delivery or audible audio from a person's phone.
- A green build/CI cannot establish a real-world Instagram Story native handoff or WhatsApp's cached image preview.
- Neither the status of the older PR #37 nor a preview URL authorizes replacing recent `main` changes.

**Current decision: NO-GO for claiming full Oddio 2.0 acceptance.** The review branch targets one reproducible sharing gate and the identified Story test instability; all external-system steps remain explicitly gated.
