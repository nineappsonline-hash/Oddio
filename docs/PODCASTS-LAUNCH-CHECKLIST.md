# Oddio Podcasts — deployment and publishing checklist

## Product
- The public product switcher is displayed at the top of Oddio, with Music (`/{locale}`) and Podcasts (`/{locale}/podcasts`).
- Podcast categories: Technology, Business, Education, Science, Culture, Comedy, Stories, Health & Wellness, News & Society, Sports, Music & Arts.
- Public routes include home, category directory, category details, show details, and episode details.
- Search is scoped to podcasts on the podcast home page; the normal music search is unchanged.
- Music and podcast audio have distinct UIs. Changing into podcast mode pauses music.
- Podcast episode playback is private-R2-backed with server-side publication verification and short-lived signed redirects; it is **not proxied through Vercel**.
- Publishing tools are available at `/{locale}/podcasts/manage` to super_admin and admin only.
- UI artwork and category labels are real project design assets / taxonomy; **no fabricated show or episode content is inserted**.

## Database migration — BLOCKING FOR PUBLISHING
Apply `supabase/migrations/20261116010000_podcast_catalog.sql` to the production Supabase project (project-ai-music).
The file creates `podcast_categories`, `podcast_shows`, `podcast_episodes`, foreign keys and indexes. It enables RLS and public-read policies only for published entities. The migration seeds category names/translations, but no fake podcast programs.
Before application, the web app displays the category directory from built-in fallback; show/episode lists are empty. The management page explicitly reports the missing migration.
A denied API permission prevented us from running this migration from the connected Supabase account; **do not claim it has run**.

## Cloudflare R2
The current streaming bucket is `ai-music-streaming`, with the signed-upload key prefix `podcasts/{uuid}.mp3`. The existing `presignR2StreamingPut` and `presignR2Get` sign this bucket. No database is used to store raw audio bytes.
Enable CORS on the streaming R2 bucket for `https://oddio.online` (and the testing domain if used), allowing PUT, GET and HEAD with Content-Type and Range request headers. Validate a test MP3 upload, metadata reading and seek/range playback on Safari and Chrome.
For an episode, the admin tool creates a draft, uploads audio directly to R2, verifies that a 1-byte Range request succeeds (206), then marks the episode published. If upload fails, draft remains unpublished.

## Launch QA
1. Verify the Music/Podcasts switcher in EN and AR, keyboard tab navigation and mobile widths 320–430 px.
2. Confirm all prior music routes, playback, lyric displays and playlists remain unaffected.
3. Check podcast empty states before first publication; confirm 11 categories are visible.
4. Apply database migration; verify categories appear and staff-only publishing works.
5. Publish one real show and one authorized original MP3 episode. Confirm the page, category listing, show page and episode URL all render.
6. Check playback, 15 sec backward / 30 sec forward, speed, seek, volume, live R2 Range responses.
7. Verify public visitors cannot fetch draft, unpublished or future episodes, including direct media endpoints.
8. Review schema.org PodcastSeries and PodcastEpisode, localized metadata, sitemap entries only for public items.
9. Confirm no duplicate audio plays when changing between Music and Podcasts.
10. Run deployment health check and monitor cloud storage/bandwidth.

## Known deferrals
- Listener subscriptions, progress sync, queues, downloads and recommendations are later phases, not v1.
- Podcast moderation workflow and creators outside staff roles are not enabled without a verified publishing policy.
- Dynamic Cloudflare cover-image upload, RSS import and outbound RSS feeds remain future work.
