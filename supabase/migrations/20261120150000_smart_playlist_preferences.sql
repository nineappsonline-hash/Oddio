-- Account-owned smart playlist rules. Only server-side service role has access.
-- Apply in staging before enabling the /api/library/smart-playlists route in production.
create table if not exists public.smart_playlist_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint smart_playlist_rules_array check (jsonb_typeof(rules) = 'array'),
  constraint smart_playlist_rules_max_length check (jsonb_array_length(rules) <= 12),
  constraint smart_playlist_rules_max_bytes check (octet_length(rules::text) <= 12288)
);
alter table public.smart_playlist_preferences enable row level security;
revoke all on public.smart_playlist_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.smart_playlist_preferences to service_role;
