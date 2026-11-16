-- Audio integrity metadata for podcast uploads, required by the publishing checks.
-- Run AFTER 20261116010000_podcast_catalog.sql.
ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS audio_bytes bigint;
ALTER TABLE public.podcast_episodes
  DROP CONSTRAINT IF EXISTS podcast_episodes_audio_bytes_check;
ALTER TABLE public.podcast_episodes
  ADD CONSTRAINT podcast_episodes_audio_bytes_check
  CHECK (audio_bytes IS NULL OR audio_bytes BETWEEN 1024 AND 314572800);

COMMENT ON COLUMN public.podcast_episodes.audio_bytes IS
'Advertised upload bytes, verified against the real R2 Content-Range before publication.';
