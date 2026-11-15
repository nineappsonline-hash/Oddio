-- Phase 4 spectral screening signatures are operational, non-public data.
-- These signatures are NOT an infringement verdict. No third-party uploads.
create table if not exists public.audio_fingerprints (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  signature jsonb not null,
  updated_at timestamptz not null default now(),
  constraint audio_fingerprints_valid_signature check (
    jsonb_typeof(signature) = 'object'
    and signature ->> 'version' = '1'
    and jsonb_typeof(signature -> 'shingles') = 'array'
    and jsonb_array_length(signature -> 'shingles') between 8 and 2000
  )
);
alter table public.audio_fingerprints enable row level security;
revoke all on public.audio_fingerprints from anon, authenticated;
grant select, insert, update, delete on public.audio_fingerprints to service_role;

comment on table public.audio_fingerprints is
  'Private candidate-similarity screening signatures, not public metadata or proof of infringement.';

-- Candidate model suggestions are private until the owner reviews them.
-- Public tracks.audio_features intentionally exposes measurements only.
create table if not exists public.audio_tag_suggestions (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  suggestion jsonb not null,
  updated_at timestamptz not null default now(),
  constraint audio_tag_suggestion_object check (
    jsonb_typeof(suggestion) = 'object'
    and suggestion ->> 'source' = 'artist-reviewed-local-model-v1'
    and jsonb_typeof(suggestion -> 'genreSlug') = 'string'
    and jsonb_typeof(suggestion -> 'moodSlugs') = 'array'
  )
);
alter table public.audio_tag_suggestions enable row level security;
revoke all on public.audio_tag_suggestions from anon, authenticated;
grant select, insert, update, delete on public.audio_tag_suggestions to service_role;

comment on table public.audio_tag_suggestions is
  'Pending artist-only genre/mood suggestions from reviewed offline classifier.';
