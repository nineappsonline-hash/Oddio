-- Phase 7 collaborative PUBLIC playlists. Development branch only.
-- Server-only invited editors; never expose invite hashes or membership via Data API.
create table if not exists public.playlist_collaborators (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (playlist_id,user_id)
);
create index if not exists playlist_collaborators_user_idx
 on public.playlist_collaborators (user_id,created_at desc);
alter table public.playlist_collaborators enable row level security;
revoke all on public.playlist_collaborators from public,anon,authenticated;
grant select,insert,delete on public.playlist_collaborators to service_role;

create table if not exists public.playlist_collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  max_uses integer not null default 10 check (max_uses between 1 and 10),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists playlist_collab_invites_playlist_idx
 on public.playlist_collaboration_invites (playlist_id,created_at desc);
alter table public.playlist_collaboration_invites enable row level security;
revoke all on public.playlist_collaboration_invites from public,anon,authenticated;
grant select,insert,update,delete on public.playlist_collaboration_invites to service_role;

create or replace function public.oddio_join_playlist_invite(
 p_user_id uuid, p_playlist_id uuid, p_code_hash text
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  invite record;
  owner_id uuid;
begin
  select i.* into invite
  from public.playlist_collaboration_invites i
  where i.code_hash=p_code_hash and i.playlist_id=p_playlist_id
    and i.revoked_at is null
    and i.expires_at>now()
  for update;
  if not found or invite.use_count>=invite.max_uses then
    raise exception 'Invite invalid or expired' using errcode='P0002';
  end if;
  select p.owner_id into owner_id
  from public.playlists p
  where p.id=invite.playlist_id and p.visibility='public';
  if not found then
    raise exception 'Playlist unavailable' using errcode='P0002';
  end if;
  if owner_id=p_user_id then
    raise exception 'Owner already has edit access' using errcode='23505';
  end if;
  if exists(select 1 from public.playlist_collaborators c
    where c.playlist_id=invite.playlist_id and c.user_id=p_user_id) then
    return invite.playlist_id;
  end if;
  if (select count(*) from public.playlist_collaborators c
      where c.playlist_id=invite.playlist_id)>=10 then
    raise exception 'Collaborator limit reached' using errcode='23514';
  end if;
  insert into public.playlist_collaborators(playlist_id,user_id)
  values(invite.playlist_id,p_user_id);
  update public.playlist_collaboration_invites set use_count=use_count+1
  where id=invite.id;
  return invite.playlist_id;
end;
$$;

create or replace function public.oddio_collaborator_add_playlist_track(
 p_user_id uuid,p_playlist_id uuid,p_track_id uuid
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare next_position integer;
begin
  perform 1 from public.playlists p
  where p.id=p_playlist_id and p.visibility='public'
    and exists(select 1 from public.playlist_collaborators c
      where c.playlist_id=p.id and c.user_id=p_user_id)
  for update;
  if not found then raise exception 'Playlist unavailable' using errcode='P0002'; end if;
  if not exists(
    select 1 from public.tracks t where t.id=p_track_id
      and t.review_status='approved' and t.publish_status='published'
      and t.visibility='public' and t.release_at<=now()
  ) then raise exception 'Track unavailable' using errcode='P0002'; end if;
  if exists(select 1 from public.playlist_tracks
      where playlist_id=p_playlist_id and track_id=p_track_id) then return; end if;
  select coalesce(max(position),-1)+1 into next_position
    from public.playlist_tracks where playlist_id=p_playlist_id;
  insert into public.playlist_tracks(playlist_id,track_id,position)
    values(p_playlist_id,p_track_id,next_position);
end;
$$;

create or replace function public.oddio_collaborator_remove_playlist_track(
 p_user_id uuid,p_playlist_id uuid,p_track_id uuid
) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  perform 1 from public.playlists p where p.id=p_playlist_id
    and p.visibility='public'
    and exists(select 1 from public.playlist_collaborators c
      where c.playlist_id=p.id and c.user_id=p_user_id) for update;
  if not found then raise exception 'Playlist unavailable' using errcode='P0002'; end if;
  delete from public.playlist_tracks where playlist_id=p_playlist_id and track_id=p_track_id;
end;
$$;

revoke all on function public.oddio_join_playlist_invite(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.oddio_collaborator_remove_playlist_track(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.oddio_join_playlist_invite(uuid,uuid,text) to service_role;
grant execute on function public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid) to service_role;
grant execute on function public.oddio_collaborator_remove_playlist_track(uuid,uuid,uuid) to service_role;
