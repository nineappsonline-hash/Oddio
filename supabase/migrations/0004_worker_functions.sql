-- Project AI Music — queue helpers for the media worker (service role only).

create or replace function public.enqueue_job(
  p_type text,
  p_idempotency_key text,
  p_entity_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_run_at timestamptz default now()
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.jobs;
begin
  insert into public.jobs (type, entity_id, idempotency_key, payload, next_run_at)
  values (p_type, p_entity_id, p_idempotency_key, p_payload, p_run_at)
  on conflict (idempotency_key) do update
    set updated_at = now()
  returning * into row_out;

  return row_out;
end;
$$;

create or replace function public.claim_jobs(p_limit integer default 5)
returns setof public.jobs
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select j.id
    from public.jobs j
    where j.state in ('queued', 'failed')
      and j.attempts < j.max_attempts
      and j.next_run_at <= now()
    order by j.next_run_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 50))
  )
  update public.jobs j
     set state = 'running',
         attempts = j.attempts + 1,
         updated_at = now()
    from candidates c
   where j.id = c.id
  returning j.*;
$$;

create or replace function public.complete_job(p_job uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.jobs
     set state = 'succeeded', last_error = '', updated_at = now()
   where id = p_job;
$$;

create or replace function public.fail_job(p_job uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts integer;
  max_attempts integer;
  backoff_seconds integer;
begin
  select attempts, max_attempts
    into current_attempts, max_attempts
    from public.jobs
   where id = p_job
   for update;

  if not found then
    return;
  end if;

  backoff_seconds := least(3600, (30 * power(2, greatest(0, current_attempts - 1)))::integer);

  update public.jobs
     set state = case when current_attempts >= max_attempts then 'dead'::public.job_state else 'failed'::public.job_state end,
         last_error = left(coalesce(p_error, ''), 4000),
         next_run_at = now() + make_interval(secs => backoff_seconds),
         updated_at = now()
   where id = p_job;
end;
$$;

create or replace function public.expire_stale_playback_sessions()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.playback_sessions
    where last_seen_at < now() - interval '24 hours'
    returning 1
  )
  select count(*)::integer from deleted;
$$;

create or replace function public.recompute_unique_listeners(p_date date default (now() at time zone 'utc')::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.track_daily_stats s
     set unique_listeners = coalesce((
       select count(distinct coalesce(ps.user_id::text, ps.anonymous_session_hash))
       from public.playback_events e
       join public.playback_sessions ps on ps.id = e.session_id
       where e.track_id = s.track_id
         and e.qualified
         and (e.occurred_at at time zone 'utc')::date = s.date
     ), 0)
   where s.date = p_date;

  return 1;
end;
$$;

revoke all on function public.enqueue_job(text, text, uuid, jsonb, timestamptz) from public;
revoke all on function public.claim_jobs(integer) from public;
revoke all on function public.complete_job(uuid) from public;
revoke all on function public.fail_job(uuid, text) from public;
revoke all on function public.expire_stale_playback_sessions() from public;
revoke all on function public.recompute_unique_listeners(date) from public;

grant execute on function public.enqueue_job(text, text, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.claim_jobs(integer) to service_role;
grant execute on function public.complete_job(uuid) to service_role;
grant execute on function public.fail_job(uuid, text) to service_role;
grant execute on function public.expire_stale_playback_sessions() to service_role;
grant execute on function public.recompute_unique_listeners(date) to service_role;