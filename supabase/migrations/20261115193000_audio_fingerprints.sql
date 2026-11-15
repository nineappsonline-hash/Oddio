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
