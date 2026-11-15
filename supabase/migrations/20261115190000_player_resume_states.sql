-- Account-owned continuation state. This is a staging-only migration until
-- end-to-end backup/restore, privacy and browser checks pass.
-- Do not grant broad access to anonymous users or expose this table in search.
create table if not exists public.player_resume_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  queue_track_ids uuid[] not null default '{}',
  current_time_seconds double precision not null default 0
    check (current_time_seconds >= 0 and current_time_seconds <= 14400),
  volume double precision not null default 0.8
    check (volume >= 0 and volume <= 1),
  muted boolean not null default false,
  repeat_mode text not null default 'off'
    check (repeat_mode in ('off', 'one', 'all')),
  shuffle boolean not null default false,
  autoplay boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint player_queue_limited check (coalesce(array_length(queue_track_ids, 1), 0) <= 50)
);

alter table public.player_resume_states enable row level security;
-- The web API uses a service-role client after server-side cookie validation,
-- so end users cannot directly update another user's state via PostgREST.
revoke all on public.player_resume_states from anon, authenticated;
grant select, insert, update, delete on public.player_resume_states to service_role;

create index if not exists player_resume_states_updated_at_idx
  on public.player_resume_states(updated_at);
