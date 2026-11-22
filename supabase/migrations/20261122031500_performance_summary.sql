-- Aggregated read-only diagnostics for Oddio administrators.
-- Restricted to the service role and grouped to avoid exposing raw samples.
create or replace function public.oddio_performance_summary(p_days integer default 7)
returns table (
  metric text,
  device_group text,
  page_group text,
  browser_group text,
  sample_count bigint,
  p50 numeric,
  p75 numeric,
  p95 numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.metric,
    s.device_group,
    s.page_group,
    s.browser_group,
    count(*)::bigint,
    round((percentile_cont(0.5) within group (order by s.value))::numeric, 2),
    round((percentile_cont(0.75) within group (order by s.value))::numeric, 2),
    round((percentile_cont(0.95) within group (order by s.value))::numeric, 2)
  from public.client_performance_samples s
  where s.recorded_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 30)))
  group by s.metric, s.device_group, s.page_group, s.browser_group
  order by s.metric, s.device_group, s.page_group, s.browser_group;
$$;
revoke all on function public.oddio_performance_summary(integer) from public, anon, authenticated;
grant execute on function public.oddio_performance_summary(integer) to service_role;
