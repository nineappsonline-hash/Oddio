-- Privacy-preserving performance sampling for Oddio.
-- No user ID, IP address, session ID, track ID, or raw URL is persisted.
create table if not exists public.client_performance_samples (
  id bigint generated always as identity primary key,
  recorded_at timestamptz not null default now(),
  metric text not null check (
    metric in ('lcp','cls','fcp','long_task','audio_startup','audio_rebuffer')
  ),
  value numeric(12,3) not null check (value >= 0 and value <= 120000),
  page_group text not null check (
    page_group in ('home','discover','search','podcasts','other')
  ),
  device_group text not null check (device_group in ('mobile','desktop')),
  browser_group text not null check (
    browser_group in ('safari','firefox','chromium','other')
  ),
  locale text not null check (locale in ('ar','en'))
);

create index if not exists client_performance_samples_time_idx
  on public.client_performance_samples (recorded_at desc);
create index if not exists client_performance_samples_metric_time_idx
  on public.client_performance_samples (metric, recorded_at desc);

alter table public.client_performance_samples enable row level security;
revoke all on public.client_performance_samples from public, anon, authenticated;
grant select, insert, delete on public.client_performance_samples to service_role;
grant usage, select on sequence public.client_performance_samples_id_seq to service_role;

comment on table public.client_performance_samples is
  'Sampled and non-identifying Oddio web/audio performance. Delete after 30 days.';
