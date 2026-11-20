-- Keep first-run genre onboarding per account, not per browser.
-- Backfill existing profiles as completed: onboarding is exclusively for new signups.
create table if not exists public.favorite_genre_onboarding (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  genre_ids uuid[] not null default '{}'::uuid[],
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint favorite_genre_onboarding_three_max check (cardinality(genre_ids) <= 3)
);
alter table public.favorite_genre_onboarding enable row level security;
revoke all on public.favorite_genre_onboarding from public, anon, authenticated;
grant select, insert, update, delete on public.favorite_genre_onboarding to service_role;
insert into public.favorite_genre_onboarding (user_id, completed)
select id, true from public.profiles
on conflict (user_id) do nothing;
