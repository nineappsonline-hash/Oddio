-- Phase 5 account-owned discovery exclusions, staging-first.
-- Install after a verified backup and before deploying the dependent web routes.
-- No direct browser/API role access: only the authenticated server route with
-- service_role may access the saved preference row.
create table if not exists public.discovery_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hidden_track_ids uuid[] not null default '{}',
  hidden_genre_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint discovery_hidden_tracks_limit check (
    coalesce(array_length(hidden_track_ids, 1), 0) <= 100
  ),
  constraint discovery_hidden_genres_limit check (
    coalesce(array_length(hidden_genre_ids, 1), 0) <= 50
  )
);

alter table public.discovery_preferences enable row level security;
revoke all on public.discovery_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.discovery_preferences to service_role;

create index if not exists discovery_preferences_updated_idx
  on public.discovery_preferences(updated_at);
