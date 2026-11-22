# Mobile performance work — November 2026

## Implemented

- Scope storefront Supabase reads to music and the current listener; skip moderation and global event tables.
- Avoid repeated linear relation scans with catalog indexes.
- Paginate published catalog results in Postgres for genre/language browsing, including count and cursor; fall back to full catalog when unavailable.
- Keep free-text search on the richer existing artist/album/alias matching path until an indexed cross-entity search query can be deployed and correctness-tested.
- Window queues longer than 60 entries in the full player with overscan, preserved global reorder indexes, keyboard moves and scroll-to-focus.
- Delay desktop-only navigation bundles on mobile and mount the full player only when expanded.
- Reduce player time-store writes and slow ambient rendering on mobile.
- Optimize local artwork with Next Image and Cloudinary artwork via responsive formats/widths. Signed external media is not proxied through the public image optimizer.
- Capture iPhone 13-emulated FCP, LCP, CLS, long tasks, request count and JS transfer sizes in CI.

## Validation

- Vercel production build status and the public Home, Discover and Search HTTP responses should be checked after each release.
- GitHub browser smoke tests cover desktop/mobile, Arabic/English, playback, queue, lyrics and search.
- CI metrics are synthetic Chromium mobile emulation. They are **not** field Core Web Vitals or real iPhone Safari results.

## Follow-up requiring a connected Oddio database or device

- Verify query plans against production data (EXPLAIN ANALYZE), then implement indexed, cross-entity full-text search that preserves Arabic normalization, aliases, typo matching, access control and accurate totals.
- Confirm external artwork domains and configure image resizing for any hosting provider beyond Cloudinary; do not rewrite signed/private URLs.
- Collect real-device Safari traces (LCP, INP, CLS, audio start latency) on a physical iPhone on both Wi-Fi and a throttled mobile connection before setting hard performance budgets.
