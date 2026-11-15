-- Phase 6: private, owner-initiated artist review appeals.
-- This migration stays in development; DO NOT apply to production until rollout.
create table if not exists public.track_review_appeals (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  artist_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 30 and 2000),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'upheld', 'overturned')),
  response text check (response is null or char_length(response) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint appeal_review_consistency check (
    (status in ('submitted', 'under_review') and reviewed_at is null)
    or (status in ('upheld', 'overturned') and reviewed_at is not null and reviewed_by is not null)
  )
);

create index if not exists track_review_appeals_artist_created_idx
  on public.track_review_appeals (artist_user_id, created_at desc);
create index if not exists track_review_appeals_status_created_idx
  on public.track_review_appeals (status, created_at asc);
create unique index if not exists track_review_appeals_one_open_idx
  on public.track_review_appeals (track_id)
  where status in ('submitted','under_review');

alter table public.track_review_appeals enable row level security;
revoke all on public.track_review_appeals from public, anon, authenticated;
grant select, insert, update on public.track_review_appeals to service_role;
comment on table public.track_review_appeals is
  'Private artist appeals for human review; appeal decisions do not automatically publish content.';
