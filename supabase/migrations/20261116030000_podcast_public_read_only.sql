-- Podcast catalog is published by Oddio's server-side service role only.
-- Restrict browser database roles to reading RLS-visible public content.
REVOKE ALL PRIVILEGES ON TABLE
  public.podcast_categories,
  public.podcast_shows,
  public.podcast_episodes
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.podcast_categories,
  public.podcast_shows,
  public.podcast_episodes
TO anon, authenticated;

-- No direct listener writes. All publishing must use the authenticated
-- admin API on the server. Keep existing read RLS policies enabled.
