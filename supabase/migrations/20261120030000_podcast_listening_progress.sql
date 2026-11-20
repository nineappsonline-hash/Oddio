-- Podcast listening progress is private per account. API routes use the server
-- service role and verify the authenticated viewer before invoking the RPC.
create table if not exists public.podcast_listening_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.podcast_episodes(id) on delete cascade,
  seconds double precision not null default 0 check (seconds >= 0 and seconds <= 86400),
  duration double precision not null check (duration > 0 and duration <= 86400),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);
create index if not exists podcast_listening_progress_user_updated
  on public.podcast_listening_progress(user_id, updated_at desc);

alter table public.podcast_listening_progress enable row level security;
revoke all on public.podcast_listening_progress from public, anon, authenticated;
grant select, insert, update, delete on public.podcast_listening_progress to service_role;

-- One atomic write per entry: older/offline device updates cannot clobber a
-- newer entry or resurrect an episode marked complete on another device.
create or replace function public.merge_podcast_listening_progress(
  p_user_id uuid, p_entries jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  v_episode_id uuid;
  v_seconds double precision;
  v_duration double precision;
  v_updated_at timestamptz;
  v_completed boolean;
begin
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 40 then
    raise exception 'Invalid progress batch';
  end if;
  for item in select value from jsonb_array_elements(p_entries) loop
    v_episode_id := (item->>'episodeId')::uuid;
    v_seconds := (item->>'seconds')::double precision;
    v_duration := (item->>'duration')::double precision;
    v_updated_at := to_timestamp((item->>'updatedAt')::double precision / 1000);
    v_completed := coalesce((item->>'completed')::boolean, false);
    if v_seconds < 0 or v_seconds > 86400 or v_duration <= 0 or v_duration > 86400
      or v_updated_at > now() + interval '5 minutes'
      or v_updated_at < now() - interval '365 days' then
      raise exception 'Invalid progress data';
    end if;

    -- Only currently published episodes from published shows can be synced.
    if not exists (
      select 1 from public.podcast_episodes e
      join public.podcast_shows s on s.id = e.show_id
      where e.id = v_episode_id and e.status = 'published'
        and e.published_at <= now() and s.status = 'published'
    ) then
      continue;
    end if;

    insert into public.podcast_listening_progress (
      user_id, episode_id, seconds, duration, completed, updated_at
    ) values (p_user_id, v_episode_id, v_seconds, v_duration, v_completed, v_updated_at)
    on conflict (user_id, episode_id) do update set
      seconds = excluded.seconds,
      duration = excluded.duration,
      completed = excluded.completed,
      updated_at = excluded.updated_at
    where public.podcast_listening_progress.updated_at < excluded.updated_at;
  end loop;

  -- Cap personal history to a bounded number of recent records.
  delete from public.podcast_listening_progress p
  where p.user_id = p_user_id and p.episode_id in (
    select episode_id from public.podcast_listening_progress
    where user_id = p_user_id order by updated_at desc offset 40
  );
end;
$$;
revoke all on function public.merge_podcast_listening_progress(uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.merge_podcast_listening_progress(uuid,jsonb) to service_role;
