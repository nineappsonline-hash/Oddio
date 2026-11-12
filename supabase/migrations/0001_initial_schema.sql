-- Project AI Music — initial schema
-- Postgres 15 / Supabase. All timestamps are UTC timestamptz.

create extension if not exists pgcrypto;

create type public.locale_code as enum ('en', 'ar');
create type public.visibility as enum ('public', 'unlisted', 'private');
create type public.review_status as enum (
  'draft',
  'processing',
  'ready_for_review',
  'pending_review',
  'approved',
  'rejected',
  'changes_requested'
);
create type public.publish_status as enum (
  'unpublished',
  'scheduled',
  'published',
  'available_private'
);
create type public.artist_application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'needs_information'
);
create type public.verification_status as enum (
  'not_requested',
  'pending',
  'approved',
  'rejected'
);
create type public.staff_role as enum ('super_admin', 'admin', 'moderator');
create type public.report_reason as enum (
  'copyright',
  'impersonation',
  'explicit_content',
  'harassment',
  'spam',
  'other'
);
create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.report_target as enum ('track', 'artist', 'comment');
create type public.notification_type as enum (
  'artist_application_decision',
  'track_review_decision',
  'new_release',
  'verification_decision',
  'system'
);
create type public.production_type as enum ('fully_ai', 'ai_assisted');
create type public.audio_kind as enum ('original', 'rendition');
create type public.processing_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.comment_status as enum ('visible', 'hidden', 'pending');
create type public.playback_event_type as enum (
  'start',
  'progress',
  'qualified',
  'pause',
  'seek',
  'complete',
  'error'
);
create type public.featured_entity as enum ('track', 'artist', 'playlist');
create type public.job_state as enum ('queued', 'running', 'succeeded', 'failed', 'dead');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  avatar_key text not null default '',
  locale public.locale_code not null default 'en',
  country text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_](?:[a-z0-9_.-]{1,28}[a-z0-9_])?$')
);
create index profiles_display_name_idx on public.profiles (lower(display_name));

-- Private, owner-only settings kept out of the publicly readable profile row.
create table public.profile_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index staff_roles_role_idx on public.staff_roles (role);

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  label_ar text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  label_ar text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Artist onboarding and identities
-- ---------------------------------------------------------------------------

create table public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  description text not null,
  portfolio_url text not null default '',
  contact_email text not null,
  rights_declared boolean not null default false,
  rights_version text not null default '2026-01',
  status public.artist_application_status not null default 'submitted',
  reviewer_id uuid references public.profiles (id) on delete set null,
  review_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_reviewer_not_self check (reviewer_id is null or reviewer_id <> applicant_id)
);
create index artist_applications_status_idx on public.artist_applications (status, created_at desc);
create unique index artist_applications_one_open_idx
  on public.artist_applications (applicant_id)
  where status in ('submitted', 'under_review', 'needs_information');

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  bio text not null default '',
  avatar_key text not null default '',
  cover_key text not null default '',
  accent text not null default '#9D5CFF',
  featured_track_id uuid,
  verification_status public.verification_status not null default 'not_requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artists_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artists_accent_format check (accent ~ '^#[0-9A-Fa-f]{6}$')
);
create index artists_owner_idx on public.artists (owner_user_id);

create table public.artist_social_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  platform text not null,
  url text not null,
  sort_order integer not null default 0,
  unique (artist_id, platform, url)
);
create index artist_social_links_artist_idx on public.artist_social_links (artist_id, sort_order);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  description text not null default '',
  artwork_key text not null default '',
  release_at timestamptz not null default now(),
  status public.publish_status not null default 'unpublished',
  visibility public.visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index albums_artist_idx on public.albums (artist_id, release_at desc);
create index albums_public_idx on public.albums (status, visibility, release_at)
  where status = 'published';

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  title text not null,
  slug text not null,
  description text not null default '',
  genre_id uuid not null references public.genres (id),
  language_code text not null default 'en',
  country_code text not null default '',
  production_type public.production_type not null default 'fully_ai',
  ai_tools text not null default '',
  explicit boolean not null default false,
  visibility public.visibility not null default 'public',
  review_status public.review_status not null default 'draft',
  publish_status public.publish_status not null default 'unpublished',
  release_at timestamptz not null default now(),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  lyrics text not null default '',
  credits text not null default '',
  artwork_key text not null default '',
  artwork_accent text not null default '#9D5CFF',
  quality_label text not null default 'standard',
  qualified_plays bigint not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, slug),
  constraint tracks_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tracks_release_requires_review
    check (publish_status <> 'published' or review_status = 'approved')
);
create index tracks_public_idx
  on public.tracks (review_status, publish_status, visibility, release_at desc);
create index tracks_artist_idx on public.tracks (artist_id, created_at desc);
create index tracks_album_idx on public.tracks (album_id, created_at);
create index tracks_genre_idx on public.tracks (genre_id);
create index tracks_qualified_idx on public.tracks (qualified_plays desc, release_at desc);
create index tracks_search_idx on public.tracks using gin (search_vector);

alter table public.artists
  add constraint artists_featured_track_fk
  foreign key (featured_track_id) references public.tracks (id) on delete set null;

create table public.track_moods (
  track_id uuid not null references public.tracks (id) on delete cascade,
  mood_id uuid not null references public.moods (id) on delete cascade,
  primary key (track_id, mood_id)
);
create index track_moods_mood_idx on public.track_moods (mood_id);

create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  kind public.audio_kind not null,
  object_key text not null,
  format text not null,
  bitrate_kbps integer not null check (bitrate_kbps > 0),
  sample_rate integer not null check (sample_rate > 0),
  channels integer not null check (channels between 1 and 8),
  bytes bigint not null check (bytes > 0),
  sha256 text not null,
  processing_status public.processing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, kind, sha256)
);
create index audio_assets_track_idx on public.audio_assets (track_id, kind);
create index audio_assets_pending_idx on public.audio_assets (processing_status)
  where processing_status in ('pending', 'processing');

create table public.artwork_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  object_key text not null unique,
  dimensions text not null default '',
  mime text not null default 'image/jpeg',
  moderation_state text not null default 'pending',
  created_at timestamptz not null default now()
);
create index artwork_assets_owner_idx on public.artwork_assets (owner_id);

create table public.track_reviews (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision public.review_status not null,
  reason text not null default '',
  version integer not null default 1,
  reviewed_at timestamptz not null default now(),
  constraint reviews_decision_check
    check (decision in ('approved', 'rejected', 'changes_requested'))
);
create index track_reviews_track_idx on public.track_reviews (track_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Upload quotas
-- ---------------------------------------------------------------------------

create table public.upload_quotas (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  daily_limit integer not null default 5 check (daily_limit between 0 and 100),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.upload_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  counted_date_utc date not null default (now() at time zone 'utc')::date,
  status text not null default 'counted' check (status in ('counted', 'failed', 'reverted')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index upload_events_quota_idx on public.upload_events (user_id, counted_date_utc, status);

-- ---------------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------------

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index likes_track_idx on public.likes (track_id);

create table public.artist_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create index artist_follows_artist_idx on public.artist_follows (artist_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status public.comment_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_track_idx on public.comments (track_id, created_at desc);
create index comments_status_idx on public.comments (status, created_at desc);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  visibility public.visibility not null default 'public',
  cover_key text not null default '',
  follower_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_owner_idx on public.playlists (owner_id, created_at desc);
create index playlists_public_idx on public.playlists (visibility, created_at desc)
  where visibility = 'public';

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id),
  unique (playlist_id, position)
);
create index playlist_tracks_track_idx on public.playlist_tracks (track_id);

create table public.playlist_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, playlist_id)
);
create index playlist_follows_playlist_idx on public.playlist_follows (playlist_id);

-- ---------------------------------------------------------------------------
-- Playback and charts
-- ---------------------------------------------------------------------------

create table public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_session_hash text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint playback_session_owner_check check (user_id is not null or anonymous_session_hash is not null)
);

create table public.playback_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.playback_sessions (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  event_type public.playback_event_type not null,
  audible_ms integer not null check (audible_ms between 0 and 86400000),
  qualified boolean not null default false,
  occurred_at timestamptz not null default now(),
  request_id text not null,
  unique (session_id, request_id)
);
create index playback_events_track_idx on public.playback_events (track_id, occurred_at desc);
create unique index playback_events_qualified_once
  on public.playback_events (session_id, track_id)
  where qualified;

create table public.track_daily_stats (
  track_id uuid not null references public.tracks (id) on delete cascade,
  date date not null,
  country_code text not null default '',
  qualified_plays integer not null default 0,
  unique_listeners integer not null default 0,
  primary key (track_id, date, country_code)
);
create index track_daily_stats_date_idx on public.track_daily_stats (date desc);

-- ---------------------------------------------------------------------------
-- Messaging, moderation, operations
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id)
  where read_at is null;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  release_alerts boolean not null default true,
  email_opt_in boolean not null default false,
  push_opt_in boolean not null default false
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text not null default '',
  status public.report_status not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_no_self_assignment check (assigned_to is null or assigned_to <> reporter_id)
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  evidence text not null,
  status public.verification_status not null default 'pending',
  reviewer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_reviewer_not_requester check (reviewer_id is null or reviewer_id <> requester_id)
);
create unique index verification_requests_one_open_idx
  on public.verification_requests (artist_id)
  where status = 'pending';
create index verification_requests_status_idx on public.verification_requests (status, created_at desc);

create table public.featured_slots (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  entity_type public.featured_entity not null,
  entity_id uuid not null,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  constraint featured_window check (end_at is null or end_at > start_at)
);
create index featured_slots_active_idx on public.featured_slots (slot, rank, end_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  entity_id uuid,
  state public.job_state not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_run_at timestamptz not null default now(),
  last_error text not null default '',
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_ready_idx on public.jobs (state, next_run_at)
  where state in ('queued', 'failed');

-- ---------------------------------------------------------------------------
-- Storage buckets (private masters/renditions, public artwork/avatars)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('audio-masters', 'audio-masters', false),
  ('audio-renditions', 'audio-renditions', false),
  ('artwork', 'artwork', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;