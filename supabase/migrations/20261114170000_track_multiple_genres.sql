-- Keep genre_id as the primary genre for existing integrations.
-- genre_ids stores all selected genres for discovery and filtering.
alter table public.tracks
  add column if not exists genre_ids uuid[] not null default '{}';
update public.tracks set genre_ids = array[genre_id] where cardinality(genre_ids) = 0;
create index if not exists tracks_genre_ids_gin on public.tracks using gin (genre_ids);
