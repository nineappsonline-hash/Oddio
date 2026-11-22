-- Enable 30-day anonymous telemetry retention in Supabase-managed Postgres.
-- The plain PostgreSQL container in CI does not ship pg_cron, so this
-- migration intentionally skips scheduling when the extension isn't available.
-- The hosted Oddio project has the extension and the daily task enabled.
do $block$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute 'grant usage on schema cron to postgres';
    execute 'grant all privileges on all tables in schema cron to postgres';
    execute $job$
      select cron.schedule(
        'oddio-purge-performance-samples',
        '17 3 * * *',
        $$delete from public.client_performance_samples where recorded_at < now() - interval '30 days'$$
      )
    $job$;
  end if;
end;
$block$;
