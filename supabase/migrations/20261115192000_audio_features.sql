-- Phase 4: advisory measurements from the media worker.
-- Values are descriptive, not a genre classifier; artist genres/moods remain
-- unchanged. Apply to staging and verify worker compatibility before release.
alter table public.tracks
  add column if not exists audio_features jsonb;

alter table public.tracks
  add constraint oddio_audio_features_object
  check (audio_features is null or jsonb_typeof(audio_features) = 'object');

comment on column public.tracks.audio_features is
  'Optional advisory audio sample metrics: estimated tempo, confidence, RMS and peak. Not genre/mood tagging.';
