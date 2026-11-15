-- Phase 8: artist-verified consent for offline distribution.
-- This is a prerequisite permission ledger, NOT a download authorization.
-- Never apply to live DB until staged migrations and rollback plan are approved.
create table if not exists public.track_offline_permissions (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  artist_user_id uuid not null references public.profiles(id) on delete cascade,
  allowed boolean not null default false,
  rights_attested_at timestamptz,
  revoked_at timestamptz,
  terms_version text not null default 'offline-v1',
  updated_at timestamptz not null default now(),
  constraint offline_consent_consistent check (
    (allowed and rights_attested_at is not null and revoked_at is null)
    or (not allowed)
  )
);
create index if not exists track_offline_permissions_artist_idx
  on public.track_offline_permissions(artist_user_id,updated_at desc);
alter table public.track_offline_permissions enable row level security;
revoke all on public.track_offline_permissions from public,anon,authenticated;
grant select,insert,update on public.track_offline_permissions to service_role;
comment on table public.track_offline_permissions is
 'Explicit artist offline-rights declarations only. Not a client license or automatic permission to cache Cloudflare R2 streams.';
