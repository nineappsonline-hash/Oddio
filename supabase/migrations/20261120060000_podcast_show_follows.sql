-- Private per-user subscriptions to published podcast series.
create table if not exists public.podcast_show_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references public.podcast_shows(id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, show_id)
);
create index if not exists podcast_show_follows_recent
  on public.podcast_show_follows(user_id, followed_at desc);

alter table public.podcast_show_follows enable row level security;
revoke all on public.podcast_show_follows from public, anon, authenticated;
grant select, insert, delete on public.podcast_show_follows to service_role;
