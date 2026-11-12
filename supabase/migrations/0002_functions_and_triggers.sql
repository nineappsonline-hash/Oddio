-- Project AI Music — server-side helpers, counters and scheduled publication.

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS policies cannot recurse on staff_roles)
-- ---------------------------------------------------------------------------

create or replace function public.has_staff_role(required public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role = any (required)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_staff_role(array['super_admin', 'admin', 'moderator']::public.staff_role[]);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_staff_role(array['super_admin', 'admin']::public.staff_role[]);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_staff_role(array['super_admin']::public.staff_role[]);
$$;

create or replace function public.owns_artist(target_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.artists a
    where a.id = target_artist
      and a.owner_user_id = auth.uid()
  );
$$;

create or replace function public.owns_track(target_track uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tracks t
    join public.artists a on a.id = t.artist_id
    where t.id = target_track
      and a.owner_user_id = auth.uid()
  );
$$;

create or replace function public.can_read_track(target_track uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tracks t
    join public.artists a on a.id = t.artist_id
    where t.id = target_track
      and (
        (
          t.review_status = 'approved'
          and t.publish_status = 'published'
          and t.visibility in ('public', 'unlisted')
          and t.release_at <= now()
        )
        or a.owner_user_id = auth.uid()
        or public.is_staff()
      )
  );
$$;

create or replace function public.can_read_playlist(target_playlist uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.playlists p
    where p.id = target_playlist
      and (
        p.owner_id = auth.uid()
        or (p.visibility = 'public')
        or public.is_staff()
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'profile_settings', 'genres', 'moods', 'artist_applications', 'artists', 'albums',
    'tracks', 'audio_assets', 'comments', 'playlists', 'reports',
    'verification_requests', 'jobs'
  ]
  loop
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Search vector
-- ---------------------------------------------------------------------------

create or replace function public.tracks_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.ai_tools, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.credits, '')), 'D');
  return new;
end;
$$;

create trigger tracks_search_vector
before insert or update of title, description, ai_tools, credits
on public.tracks
for each row execute function public.tracks_search_vector();

-- ---------------------------------------------------------------------------
-- Profile bootstrap from Supabase Auth
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requested_handle text;
  final_handle text;
  display text;
  ui_locale public.locale_code;
begin
  requested_handle := lower(coalesce(new.raw_user_meta_data ->> 'handle', ''));
  requested_handle := regexp_replace(requested_handle, '[^a-z0-9_.-]', '', 'g');

  if requested_handle !~ '^[a-z0-9_](?:[a-z0-9_.-]{1,28}[a-z0-9_])?$' then
    requested_handle := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  final_handle := requested_handle;
  if exists (select 1 from public.profiles p where p.handle = final_handle) then
    final_handle := requested_handle || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  display := nullif(new.raw_user_meta_data ->> 'display_name', '');
  if display is null then
    display := final_handle;
  end if;

  ui_locale := case
    when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar'::public.locale_code
    else 'en'::public.locale_code
  end;

  insert into public.profiles (id, handle, display_name, locale, country)
  values (new.id, final_handle, display, ui_locale, coalesce(new.raw_user_meta_data ->> 'country', ''))
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Denormalized counters
-- ---------------------------------------------------------------------------

create or replace function public.sync_track_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.track_id, old.track_id);
  update public.tracks
     set like_count = (select count(*) from public.likes l where l.track_id = target)
   where id = target;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger likes_count
after insert or delete on public.likes
for each row execute function public.sync_track_like_count();

create or replace function public.sync_track_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.track_id, old.track_id);
  update public.tracks
     set comment_count = (
       select count(*) from public.comments c
       where c.track_id = target and c.status = 'visible'
     )
   where id = target;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger comments_count
after insert or delete or update of status on public.comments
for each row execute function public.sync_track_comment_count();

create or replace function public.sync_playlist_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.playlist_id, old.playlist_id);
  update public.playlists
     set follower_count = (select count(*) from public.playlist_follows f where f.playlist_id = target)
   where id = target;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger playlist_follows_count
after insert or delete on public.playlist_follows
for each row execute function public.sync_playlist_follower_count();

-- ---------------------------------------------------------------------------
-- Qualified plays: one per session+track, then update counters and daily stats
-- ---------------------------------------------------------------------------

create or replace function public.record_qualified_play()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.qualified is not true then
    return new;
  end if;

  update public.tracks
     set qualified_plays = qualified_plays + 1
   where id = new.track_id;

  insert into public.track_daily_stats (track_id, date, country_code, qualified_plays)
  values (new.track_id, (new.occurred_at at time zone 'utc')::date, '', 1)
  on conflict (track_id, date, country_code) do update
     set qualified_plays = public.track_daily_stats.qualified_plays + 1;

  return new;
end;
$$;

create trigger playback_qualified
after insert on public.playback_events
for each row execute function public.record_qualified_play();

-- ---------------------------------------------------------------------------
-- Scheduled publication (called by the media worker and on-demand)
-- ---------------------------------------------------------------------------

create or replace function public.promote_scheduled_tracks()
returns table (track_id uuid)
language sql
security definer
set search_path = public
as $$
  update public.tracks t
     set publish_status = 'published'
   where t.publish_status = 'scheduled'
     and t.review_status = 'approved'
     and t.release_at <= now()
  returning t.id;
$$;

create or replace function public.promote_scheduled_albums()
returns table (album_id uuid)
language sql
security definer
set search_path = public
as $$
  update public.albums a
     set status = 'published'
   where a.status = 'scheduled'
     and a.release_at <= now()
  returning a.id;
$$;

-- ---------------------------------------------------------------------------
-- Playlist position helper: append at the end without racing the unique index
-- ---------------------------------------------------------------------------

create or replace function public.append_playlist_track(p_playlist uuid, p_track uuid)
returns public.playlist_tracks
language plpgsql
security definer
set search_path = public
as $$
declare
  next_position integer;
  row_out public.playlist_tracks;
begin
  select coalesce(max(position) + 1, 0)
    into next_position
    from public.playlist_tracks
   where playlist_id = p_playlist;

  insert into public.playlist_tracks (playlist_id, track_id, position)
  values (p_playlist, p_track, next_position)
  on conflict (playlist_id, track_id) do update
     set added_at = now()
  returning * into row_out;

  return row_out;
end;
$$;

revoke all on function public.promote_scheduled_tracks() from public;
revoke all on function public.promote_scheduled_albums() from public;
grant execute on function public.promote_scheduled_tracks() to service_role;
grant execute on function public.promote_scheduled_albums() to service_role;
-- ---------------------------------------------------------------------------
-- Privilege guards: owners may edit presentation fields, never trust fields.
-- auth.uid() is null for service_role/worker traffic, which bypasses RLS anyway.
-- ---------------------------------------------------------------------------

create or replace function public.guard_artist_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if new.owner_user_id is distinct from old.owner_user_id
     or new.verification_status is distinct from old.verification_status
     or new.featured_track_id is distinct from old.featured_track_id then
    raise exception 'Only staff may change artist ownership, verification or featured track'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger artists_privilege_guard
before update on public.artists
for each row execute function public.guard_artist_privileged_fields();

create or replace function public.guard_track_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if new.review_status is distinct from old.review_status
     or new.qualified_plays is distinct from old.qualified_plays
     or new.like_count is distinct from old.like_count
     or new.comment_count is distinct from old.comment_count
     or new.artist_id is distinct from old.artist_id then
    raise exception 'Only staff may change review state or counters'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger tracks_privilege_guard
before update on public.tracks
for each row execute function public.guard_track_privileged_fields();

create or replace function public.guard_comment_status()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.user_id is distinct from old.user_id
     or new.track_id is distinct from old.track_id then
    raise exception 'Only staff may moderate comments'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger comments_status_guard
before update on public.comments
for each row execute function public.guard_comment_status();
