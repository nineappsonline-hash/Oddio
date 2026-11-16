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
Apply these **two migrations in order** to the production Supabase project `project-ai-music`:
1. `supabase/migrations/20261116010000_podcast_catalog.sql` — tables, policies, real categories.
2. `supabase/migrations/20261116020000_podcast_audio_integrity.sql` — expected MP3 byte count validation.
The file creates `podcast_categories`, `podcast_shows`, `podcast_episodes`, foreign keys and indexes. It enables RLS and public-read policies only for published entities. The migration seeds category names/translations, but no fake podcast programs.
Before application, the web app displays the category directory from built-in fallback; show/episode lists are empty. The management page explicitly reports the missing migration.
The Supabase plugin is currently connected to a different organization. Its project list does **not** include the Oddio project. The access-denied result for Oddio is therefore a genuine account/organization mismatch; **do not apply the migrations to another project or claim they have run**.

To unblock: switch/connect Supabase with a member of the organization containing `project-ai-music`, then apply both migrations to the correct project after checking the project's ID. Alternatively use the correct project's Supabase SQL Editor (two files in order).

## Cloudflare R2
The current streaming bucket is `ai-music-streaming`, with the signed-upload key prefix `podcasts/{uuid}.mp3`. The existing `presignR2StreamingPut` and `presignR2Get` sign this bucket. No database is used to store raw audio bytes.
Set CORS on the `ai-music-streaming` bucket. Ready-made rules are in **two formats**:
- `infra/cloudflare/r2-podcast-cors-dashboard.json`: a JSON **array**, ready for the Cloudflare R2 dashboard CORS editor.
- `infra/cloudflare/r2-podcast-cors.json`: the AWS S3 CLI `CORSRules` wrapper.

Both permit GET, HEAD and PUT from Oddio production domains with Content-Type and Range headers. **Do not apply this CORS policy to a different R2 bucket.**

Use **Cloudflare R2 Dashboard → `ai-music-streaming` → Settings → CORS policy**, paste the entire contents of `infra/cloudflare/r2-podcast-cors-dashboard.json`, and save. Cloudflare documents this array shape for presigned upload requests. Alternatively use AWS CLI with account-scoped R2 keys:

```bash
# Execute locally with account-owned credentials; never commit or paste secrets.
export AWS_ACCESS_KEY_ID='<your-r2-access-key-id>'
export AWS_SECRET_ACCESS_KEY='<your-r2-secret-access-key>'
export AWS_DEFAULT_REGION='auto'
export R2_ACCOUNT_ID='<your-r2-account-id>'
aws s3api put-bucket-cors \\
  --bucket ai-music-streaming \\
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \\
  --cors-configuration file://infra/cloudflare/r2-podcast-cors.json
aws s3api get-bucket-cors \\
  --bucket ai-music-streaming \\
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

The production Vercel environment already includes the required R2 credential variable **names**; their values were not accessed or exposed. Validate a test MP3 upload, metadata reading and seek/range playback on Safari and Chrome.
For an episode, the admin tool creates a draft, uploads audio directly to R2, verifies a 3-byte Range request succeeds (206), checks the MP3 file signature **and** verifies its actual R2 object length matches the recorded upload length (between 1 KB and 300 MB), then marks the episode published. If upload fails, draft remains unpublished.

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
10. Run `node scripts/podcast-smoke-test.mjs https://oddio.online` to check bilingual public routes, sitemap, unauthorized publisher access and invalid episode requests.
11. Trigger the `Oddio podcast smoke tests` GitHub workflow and monitor cloud storage/bandwidth. The workflow also runs weekly.

## Known deferrals
- Listener subscriptions, progress sync, queues, downloads and recommendations are later phases, not v1.
- Podcast moderation workflow and creators outside staff roles are not enabled without a verified publishing policy.
- Dynamic Cloudflare cover-image upload, RSS import and outbound RSS feeds remain future work.
