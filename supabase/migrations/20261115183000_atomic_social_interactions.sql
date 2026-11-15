-- Oddio phase 1: concurrency-safe social toggles.
-- Server-only RPC: NEVER grant these functions to anon/authenticated clients.
-- Each call is one PostgreSQL transaction. Advisory locks serialize a user's
-- toggles for the same resource while existing triggers maintain counters.

create or replace function public.oddio_toggle_track_like(p_user_id uuid, p_track_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  was_removed boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oddio:like:' || p_user_id::text || ':' || p_track_id::text, 0)
  );
  if not exists (
    select 1 from public.tracks t
    join public.artists a on a.id = t.artist_id
    where t.id = p_track_id
      and (
        (t.review_status = 'approved' and t.publish_status = 'published'
          and t.visibility in ('public', 'unlisted') and t.release_at <= now())
        or a.owner_user_id = p_user_id
        or exists (select 1 from public.staff_roles s where s.user_id = p_user_id)
      )
  ) then
    raise exception 'Track unavailable' using errcode = 'P0002';
  end if;
  delete from public.likes
  where user_id = p_user_id and track_id = p_track_id
  returning true into was_removed;
  if coalesce(was_removed, false) then
    return false;
  end if;
  insert into public.likes(user_id, track_id) values (p_user_id, p_track_id);
  return true;
end;
$$;

create or replace function public.oddio_toggle_artist_follow(p_user_id uuid, p_artist_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  was_removed boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oddio:artist:' || p_user_id::text || ':' || p_artist_id::text, 0)
  );
  if not exists (select 1 from public.artists where id = p_artist_id) then
    raise exception 'Artist unavailable' using errcode = 'P0002';
  end if;
  delete from public.artist_follows
  where user_id = p_user_id and artist_id = p_artist_id
  returning true into was_removed;
  if coalesce(was_removed, false) then
    return false;
  end if;
  insert into public.artist_follows(user_id, artist_id) values (p_user_id, p_artist_id);
  return true;
end;
$$;

create or replace function public.oddio_toggle_playlist_follow(p_user_id uuid, p_playlist_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  was_removed boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oddio:playlist:' || p_user_id::text || ':' || p_playlist_id::text, 0)
  );
  if not exists (
    select 1 from public.playlists
    where id = p_playlist_id and visibility = 'public'
  ) then
    raise exception 'Playlist unavailable' using errcode = 'P0002';
  end if;
  delete from public.playlist_follows
  where user_id = p_user_id and playlist_id = p_playlist_id
  returning true into was_removed;
  if coalesce(was_removed, false) then
    return false;
  end if;
  insert into public.playlist_follows(user_id, playlist_id)
  values (p_user_id, p_playlist_id);
  return true;
end;
$$;

create or replace function public.oddio_add_playlist_track(
  p_user_id uuid, p_playlist_id uuid, p_track_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_position integer;
begin
  -- Lock the playlist, not the snapshot: simultaneous additions can't
  -- generate the same position or overwrite another user's edits.
  perform 1 from public.playlists
  where id = p_playlist_id and owner_id = p_user_id
  for update;
  if not found then
    raise exception 'Playlist unavailable' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.tracks t
    join public.artists a on a.id = t.artist_id
    where t.id = p_track_id
      and (
        (t.review_status = 'approved' and t.publish_status = 'published'
         and t.visibility in ('public','unlisted') and t.release_at <= now())
        or a.owner_user_id = p_user_id
        or exists (select 1 from public.staff_roles s where s.user_id = p_user_id)
      )
  ) then
    raise exception 'Track unavailable' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.playlist_tracks
    where playlist_id = p_playlist_id and track_id = p_track_id
  ) then
    return;
  end if;
  select coalesce(max(position), -1) + 1 into next_position
  from public.playlist_tracks where playlist_id = p_playlist_id;
  insert into public.playlist_tracks(playlist_id, track_id, position)
  values (p_playlist_id, p_track_id, next_position);
end;
$$;

create or replace function public.oddio_remove_playlist_track(
  p_user_id uuid, p_playlist_id uuid, p_track_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $
begin
  perform 1 from public.playlists
  where id = p_playlist_id and owner_id = p_user_id
  for update;
  if not found then
    raise exception 'Playlist unavailable' using errcode = 'P0002';
  end if;
  delete from public.playlist_tracks
  where playlist_id = p_playlist_id and track_id = p_track_id;
end;
$;

-- Revoke the default PUBLIC function execute privilege before granting only
-- trusted server role access (same effective privilege for service_role).
revoke all on function public.oddio_toggle_track_like(uuid,uuid) from public, anon, authenticated;
revoke all on function public.oddio_toggle_artist_follow(uuid,uuid) from public, anon, authenticated;
revoke all on function public.oddio_toggle_playlist_follow(uuid,uuid) from public, anon, authenticated;
revoke all on function public.oddio_add_playlist_track(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.oddio_remove_playlist_track(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.oddio_toggle_track_like(uuid,uuid) to service_role;
grant execute on function public.oddio_toggle_artist_follow(uuid,uuid) to service_role;
grant execute on function public.oddio_toggle_playlist_follow(uuid,uuid) to service_role;
grant execute on function public.oddio_add_playlist_track(uuid,uuid,uuid) to service_role;
grant execute on function public.oddio_remove_playlist_track(uuid,uuid,uuid) to service_role;
