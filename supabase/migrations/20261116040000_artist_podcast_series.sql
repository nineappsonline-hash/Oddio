-- Connect each podcast series to a verified Oddio artist identity.
-- Existing staff-created shows remain valid (artist_id can be null).
alter table public.podcast_shows
  add column if not exists artist_id uuid references public.artists(id) on delete set null;

create index if not exists idx_podcast_shows_artist_id
  on public.podcast_shows(artist_id,created_at desc);

-- Number episodes within each season of one series; episode numbering
-- is optional for legacy content but cannot be duplicated when present.
create unique index if not exists idx_podcast_episode_unique_number
  on public.podcast_episodes(show_id,coalesce(season_number,1),episode_number)
  where episode_number is not null;

comment on column public.podcast_shows.artist_id is
  'Verified Oddio artist identity responsible for this podcast series.';
