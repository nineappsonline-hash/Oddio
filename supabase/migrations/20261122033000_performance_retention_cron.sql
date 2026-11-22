-- Daily 30-day retention for anonymous performance samples.
-- Supabase Cron runs entirely in Postgres; no Vercel request or user key needed.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule(
  'oddio-purge-performance-samples',
  '17 3 * * *',
  $$delete from public.client_performance_samples where recorded_at < now() - interval '30 days'$$
);
