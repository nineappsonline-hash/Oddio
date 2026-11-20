-- Podcast notification preferences and read receipts are private, server-owned.
-- The inbox is computed from published episodes released AFTER a user
-- followed that show: no background job, no unsolicited external messages.
create table if not exists public.podcast_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.podcast_notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.podcast_episodes(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);
create index if not exists podcast_notification_reads_recent_idx
  on public.podcast_notification_reads(user_id, read_at desc);

alter table public.podcast_notification_preferences enable row level security;
alter table public.podcast_notification_reads enable row level security;
revoke all on public.podcast_notification_preferences from public, anon, authenticated;
revoke all on public.podcast_notification_reads from public, anon, authenticated;
grant select, insert, update on public.podcast_notification_preferences to service_role;
grant select, insert, update, delete on public.podcast_notification_reads to service_role;
