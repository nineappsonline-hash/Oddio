# Oddio — Search, Keywords, SEO & AI Search Visibility Plan
**Baseline:** 15 November 2026 · Markets: Arabic (especially Egypt/MENA) and English (international) · Site: https://oddio.online

## Objective and honest constraints
Increase qualified organic discovery, indexable music pages and citations in AI-generated search answers. There is no way to guarantee rank #1, indexing, impressions or AI citations. Avoid bought links, keyword stuffing, made-up streaming metrics, fabricated AI claims and doorway pages. Actual search volumes, difficulty scores, rankings and indexed-page counts are **not verified**: validate them in Search Console, Bing Webmaster Tools and a keyword research tool before claiming numbers.

## Product positioning
**Entity:** Oddio is a platform for discovering, listening to and publishing original AI-generated music through a review workflow. Key public features: Discover, music Genres, Charts, Soundspace (mood-based music discovery), track/artist/album/playlist pages. Arabic and English versions exist. Do not claim that Oddio is an AI music *generator*: it is a listening/publishing platform. Do not promise legal ownership of user content, exclusive features, or universal free features without product/legal verification.

**Differentiation:** Original AI-generated songs; Arabic as a first-class browsing language; independently published AI music artists; discovery by genres, moods and playlists; artist submissions subject to review.

## Keyword architecture (prioritized, proposed targets — NOT measured volumes)

| Priority | Topic cluster | English query themes | Arabic query themes | Target page / next action | Intent |
| --- | --- | --- | --- | --- | --- |
| P0 | AI music streaming | listen to AI music, AI-generated music, AI music streaming, AI songs online, discover AI songs | موسيقى بالذكاء الاصطناعي، أغاني بالذكاء الاصطناعي، سماع أغاني AI، استماع موسيقى AI | `/en`, `/ar`, `/discover` | discover / listen |
| P0 | Oddio brand | Oddio, Oddio music, Oddio AI music, Oddio online | أوديو موسيقى، Oddio أغاني، موقع Oddio | bilingual home, `/about`, consistent brand identity | navigational |
| P0 | New AI music | new AI-generated songs, discover new AI music, latest AI music, AI music artists | أغاني AI جديدة، أحدث أغاني ذكاء اصطناعي، فنانين AI | `/discover`, artist and track pages | browse |
| P0 | Arabic AI music | Arabic AI music, AI Arabic songs, AI-generated Arabic music | أغاني عربية بالذكاء الاصطناعي، موسيقى عربية AI، أغاني مصرية AI | `/genres`, relevant real genre pages | browse |
| P1 | AI music by genre | AI pop music, AI hip-hop songs, AI electronic music, AI ambient music | موسيقى بوب AI، راب بالذكاء الاصطناعي، موسيقى إلكترونية AI، موسيقى هادئة AI | `/genres` + each `/genres/[slug]` | categorical |
| P1 | Listen by mood | relaxing AI music, AI music for studying, chill AI songs, mood-based AI music | موسيقى هادية بالذكاء الاصطناعي، موسيقى للمذاكرة AI، أغاني حسب المزاج | `/soundspace`, authentic mood pages | discovery |
| P1 | AI music charts | trending AI songs, popular AI-generated music, AI music chart | أكثر أغاني AI استماعًا، أغاني الذكاء الاصطناعي الرائجة | `/charts` | trending |
| P1 | Publishing / artist | publish AI music, submit AI songs, AI music artist platform | نشر أغاني بالذكاء الاصطناعي، نشر موسيقى AI، انضمام فنان | `/for-artists` → `/apply/artist` | creator acquisition |
| P1 | Named track + creator | [track title] by [artist], [artist name] AI music | [اسم الأغنية] [اسم الفنان]، أغاني [الفنان] AI | `/tracks/[id]`, `/artists/[slug]` | exact lookup |
| P1 | Albums/playlists | AI music playlist, AI music album, relaxing AI playlist | قوائم تشغيل موسيقى AI، ألبومات بالذكاء الاصطناعي | public playlist & album pages | browse |
| P2 | Product/explainer | what is Oddio, where to listen to AI-generated music, how to find AI artists | إيه هو Oddio، فين أسمع أغاني ذكاء اصطناعي، كيفية اكتشاف موسيقى AI | `/about` and factual guides | informational / AI citation |
| P2 | Installation | install Oddio web app, AI music app on phone | تثبيت Oddio، تطبيق موسيقى AI للموبايل | `/install` | utility |

### Keyword-to-page rules
1. Assign **one primary topic per public page** and a few naturally related variants. Do not place every keyword in every title.
2. Homepage: broad AI-music listening/discovery + brand. Discover: fresh music and artists. Genres: directory/category overview. Track/Artist/Album/Playlist: exact named queries.
3. Avoid indexing filter/pagination URLs, internal search results, login/signup and personalized dashboards. Those are not standalone valuable landing pages.
4. Use localized headings and **human-readable paragraphs visible in server-rendered HTML**. Localized meta descriptions alone do not create ranking value.
5. Titles and descriptions must match real on-page content; don't suggest copyrighted music catalogues, radio licensing or generative tools that are not part of Oddio.
6. Use the actual performer/artist name, track title, genre and available release facts on dynamic pages. Do not fake a duration while `duration_ms` remains zero.

## On-page inventory & metadata targets
| Page family | Primary topic | Metadata strategy | Indexing |
| --- | --- | --- | --- |
| Home EN/AR | listen / discover AI music | localized, branded keyword-focused title + description, matching visible intro | index |
| Discover | new AI music | fresh tracks, genres, independent artists | index |
| Genres directory | browse AI genres | Arabic, pop, hip-hop, electronic, etc. | index |
| Individual genre | exact genre AI songs | dynamic localized genre + fresh tracks | index when valid |
| Mood | music by feeling | dynamic localized mood + matching songs | index when valid |
| Charts | trending AI music | daily/weekly/monthly charts only if populated | index |
| Soundspace | mood-based music discovery | real product action and benefits | index |
| Track | '[song] by [artist]' | exact artist/title + original descriptive copy + MusicRecording | index when public |
| Artist | artist's AI songs | artist bio, real releases + MusicGroup | index when public |
| Album | '[album] by [artist]' | live production data, tracklist + MusicAlbum | index when public |
| Playlist | public AI playlist | unique playlist title, songs, creator, mood if present | index when public |
| About Oddio | entity definition & what/how | clear explanation, original FAQ-style content | index |
| For Artists | publish AI music | transparent application/review information | index |
| Install | mobile web app | installation access to actual PWA | index |
| Legal pages | user trust | unique descriptive snippets based on actual policy | index |
| Artist application | account-gated workflow | accessible only through CTA; redirect for logged-out | noindex / exclude from sitemap |
| Search, account, library, notifications, settings, studio, admin, rooms | utility/personal | concise accurate metadata, noindex, exclude from sitemap | noindex |

## SEO engineering checklist
- [x] Hreflang (EN/AR + x-default) and canonical links in shared metadata builder (verify actual output in rendered HTML).
- [x] Bilingual meta-description catalogue for public routes, utility routes and legal pages.
- [x] Dynamic metadata on public music entities.
- [x] Global WebSite and Organization JSON-LD and absolute MusicRecording/MusicAlbum/MusicGroup URLs.
- [x] Do not emit fake 0-second music duration in JSON-LD.
- [x] Sitemap includes `/genres`, `/about`, `/for-artists` and `/install`; excludes sign-in-gated application.
- [x] Footer contextual links to public genres, about and for-artists landing pages.
- [x] Production albums pull from Supabase instead of the demo dataset.
- [ ] Verify live canonical `oddio.online` for all locales in deployed HTML and Vercel environment config.
- [ ] Validate indexed URLs against Search Console and Bing Webmaster Tools.
- [ ] Check 200/301/404 status, localized hreflang reciprocity, sitemap fetch, structured-data output, robots, OG preview and mobile Core Web Vitals.
- [ ] Inspect and optimize images, LCP, INP and CLS in real device browser.
- [ ] Measure rendered HTML and indexability for individual songs/artists/albums on real production data.
- [ ] Consider sitemap lastmod based on actual content changes, not request time, for non-entity pages.
- [ ] Consider IndexNow for Bing only once publication event integration is validated. Do not fake public ping endpoints.
- [ ] Set up Google Search Console domain property + XML sitemap, Bing Webmaster Tools + AI Performance and verification/ownership.
- [ ] Link to actual off-site official profiles when verified. No invented social profiles or reviews.

## AI search / AIO (also called AEO or GEO) — no magic files
Google explicitly says conventional SEO remains foundational for AI Overviews and AI Mode: indexed, snippet-eligible pages with useful, original, accurate content. Bing’s AI Performance report exposes grounded citation pages and queries; it does not represent rank or traffic.

**Practical content work:**
- Make homepage and About Oddio explicitly explain what Oddio is, how it differs from a music generator and how an artist joins.
- Publish accurate contextual artist biographies and release notes; source all claims from actual artist data, do not auto-fill fake life stories.
- Add substantive, genuinely useful genre explanations and mood discovery guides, with tracks that truly match each category.
- Build relationships with relevant music/technology publishers, artists and communities using real releases and evidence—not paid spam links.
- Keep identifiable entity details consistent: name Oddio, canonical domain, logo, description, legal pages, public artist policy.
- Preserve accessible HTML, robots access and metadata; no mandatory `llms.txt` or custom FAQ schema is needed for Google AI search.
- Monitor citations via Bing AI Performance and real external referring domains; use this to decide which original content to deepen.

## 90-day execution plan
### Days 0–14: technical foundation and tracking
- Deploy metadata, on-page home copy, public About/For Artists, sitemap and schema.
- Validate 20 representative URLs on mobile/desktop and both locales, including noindex private pages.
- Verify domain property in Google Search Console; submit `https://oddio.online/sitemap.xml`. Verify Bing property; submit same sitemap.
- Start baseline: index coverage, impressions, clicks, CTR, average position, branded vs non-branded clicks, AI citations where measurable.
- Fix broken public album rendering, canonical duplication, and crawl errors.

### Days 15–30: durable page quality
- Audit 15+ actual track pages, at least 5 artists and every live genre; ensure distinct visible copy and context.
- Fix `duration_ms` backfill using trusted audio metadata so track schema can include real durations.
- Add explanatory summaries to valuable genre and mood pages (without generating thin near-duplicate pages).
- Improve internal links from artist → album → track → genre and from discovery lists to canonical records.
- Export and label branded/non-branded queries for EN and AR.

### Days 31–60: topical authority
- Publish original, editorially checked themed collections based on *existing* real songs (e.g. Arabic AI pop, chill AI music).
- Add 4–8 high-quality editorial guides only if each provides unique examples and user value: how AI music is reviewed, Arabic AI genres on Oddio, exploring Soundspace, creating safe AI releases.
- Build official artist pages and verifiable provenance/credits; improve music artwork and alt text.
- Earn independent coverage via authentic release stories and artist collaborations. No mass link buying.

### Days 61–90: testing and iteration
- Group Search Console queries by locale, keyword cluster and landing page; compare to baseline.
- Improve low-CTR titles only where impressions are substantial and the description matches user intent.
- Diagnose high-impression low-ranking pages: insufficient value, weak internal links, bad content match, or external authority.
- Audit Bing AI Performance cited-page trends and grounding-query patterns; improve factual clarity on cited and near-miss topics.
- Recheck CWV and metadata, prune or consolidate duplicate/thin pages, and plan the next release with evidence.

## Measurement dashboard
**Organic search:** indexed valid URLs, impressions, clicks, CTR, avg rank, top 20 landing pages, branded vs unbranded, AR vs EN, and signups from organic with consent-respecting analytics.

**Content:** percent of eligible tracks/artists/albums indexable; canonical errors, 404s, thin descriptions; link depth; rich-result eligibility where Google supports a result type.

**AI search:** Bing Webmaster AI citation counts, cited pages, grounding queries; manually sample a small fixed set of factual user questions across engines without treating one answer as a statistical ranking.

**Suggested internal 90-day goals (planning targets, not predictions):** 100% metadata coverage for indexable routes; sitemap and canonical errors < 1%; all published public albums accessible from live DB; published artist pages cross-linked; baseline + monthly progress report. Numeric growth in traffic/rank must be set **after** baseline analytics.

## Editorial safeguards
- Never claim Oddio has songs from major copyrighted artists without authorization.
- Do not call the site an AI song *generator*: it is primarily a listening and artist-publishing platform.
- Do not claim user numbers, bitrate quality, coverage regions, ad-free status or free tier benefits without confirming them.
- User-generated track descriptions may be low quality; sanitize, truncate and avoid presenting unsupported assertions as Oddio endorsements.
- Write copy for actual users first, not search bots. Follow current Google Search Central and Bing Webmaster guidelines.

## Official source references (checked Nov 2026)
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/appearance/title-link
- https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
- https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
