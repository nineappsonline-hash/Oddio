-- Phase 7: moderated listening rooms. NOT for production until gated rollout.
-- Membership, messages and private room codes are never accessible to client roles.
create table if not exists public.listening_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'open' check (status in ('open','closed')),
  track_id uuid references public.tracks(id) on delete set null,
  is_playing boolean not null default false,
  position_seconds numeric(12,3) not null default 0 check(position_seconds >= 0),
  synced_at timestamptz not null default now(),
  version bigint not null default 1 check(version > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  constraint listening_room_expires_sane check(expires_at > created_at and expires_at <= created_at + interval '6 hours')
);
create index if not exists listening_rooms_host_idx on public.listening_rooms(host_id, created_at desc);
create index if not exists listening_rooms_expiry_idx on public.listening_rooms(expires_at);
create unique index if not exists listening_rooms_one_open_per_host_idx on public.listening_rooms(host_id) where status='open';
alter table public.listening_rooms enable row level security;
revoke all on public.listening_rooms from public, anon, authenticated;
grant select,insert,update on public.listening_rooms to service_role;

create table if not exists public.listening_room_members (
  room_id uuid not null references public.listening_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'listener' check(role in ('host','listener')),
  muted boolean not null default false,
  banned boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create index if not exists room_members_lastseen_idx on public.listening_room_members(room_id,last_seen_at);
alter table public.listening_room_members enable row level security;
revoke all on public.listening_room_members from public, anon, authenticated;
grant select,insert,update,delete on public.listening_room_members to service_role;

create table if not exists public.listening_room_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.listening_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 300),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists room_messages_recent_idx on public.listening_room_messages(room_id,id desc);
create index if not exists room_messages_user_created_idx on public.listening_room_messages(user_id,created_at desc);
alter table public.listening_room_messages enable row level security;
revoke all on public.listening_room_messages from public,anon,authenticated;
grant select,insert,update on public.listening_room_messages to service_role;

-- Atomic join/refresh with cap, no ability to bypass a host ban.
create or replace function public.oddio_join_listening_room(
 p_room_id uuid, p_user_id uuid, p_code_hash text
) returns boolean
language plpgsql security invoker set search_path=''
as $$
declare
  room_rec record;
  member_rec record;
begin
  select r.id,r.host_id into room_rec from public.listening_rooms r
  where r.id=p_room_id and r.code_hash=p_code_hash
    and r.status='open' and r.expires_at>now()
  for update;
  if not found then raise exception 'Room unavailable' using errcode='P0002'; end if;
  select m.* into member_rec from public.listening_room_members m
  where m.room_id=p_room_id and m.user_id=p_user_id;
  if found then
    if member_rec.banned then raise exception 'Access denied' using errcode='42501'; end if;
    update public.listening_room_members set last_seen_at=now()
    where room_id=p_room_id and user_id=p_user_id;
    return true;
  end if;
  if (select count(*) from public.listening_room_members m
      where m.room_id=p_room_id and m.banned=false)>=25
  then raise exception 'Room full' using errcode='23514'; end if;
  insert into public.listening_room_members(room_id,user_id,role)
  values(p_room_id,p_user_id,case when room_rec.host_id=p_user_id then 'host' else 'listener' end);
  return true;
end;
$$;

-- All transport mutations are serialized by one locked room row. Host only.
create or replace function public.oddio_room_transport(
 p_room_id uuid, p_actor_id uuid, p_track_id uuid,
 p_playing boolean, p_position numeric
) returns bigint
language plpgsql security invoker set search_path=''
as $$
declare current_version bigint;
begin
  perform 1 from public.listening_rooms r
  where r.id=p_room_id and r.host_id=p_actor_id and r.status='open' and r.expires_at>now()
  for update;
  if not found then raise exception 'Host-only room control' using errcode='42501'; end if;
  if p_position is null or p_position<0 or p_position>86400 then
    raise exception 'Invalid playback position' using errcode='22023'; end if;
  if p_track_id is not null and not exists (
    select 1 from public.tracks t where t.id=p_track_id
      and t.review_status='approved' and t.publish_status='published'
      and t.visibility='public' and t.release_at<=now()
  ) then raise exception 'Track unavailable' using errcode='P0002'; end if;
  update public.listening_rooms
  set track_id=p_track_id, is_playing=(p_playing and p_track_id is not null),
      position_seconds=p_position,synced_at=now(),version=version+1
  where id=p_room_id returning version into current_version;
  return current_version;
end;
$$;

-- Persist chat only for active, unmuted members. Rate limit additionally at API.
create or replace function public.oddio_room_message(
 p_room_id uuid,p_user_id uuid,p_body text
) returns bigint
language plpgsql security invoker set search_path=''
as $$
declare new_id bigint;
begin
  if char_length(btrim(coalesce(p_body,''))) not between 1 and 300 then
    raise exception 'Invalid message' using errcode='22023'; end if;
  if not exists (
    select 1 from public.listening_room_members m
      join public.listening_rooms r on r.id=m.room_id
    where m.room_id=p_room_id and m.user_id=p_user_id
      and m.banned=false and m.muted=false
      and r.status='open' and r.expires_at>now()
  ) then raise exception 'Message not permitted' using errcode='42501'; end if;
  -- Transactional, per-user message quota cannot be bypassed by
  -- distributing requests across multiple serverless API instances.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oddio:room-chat:'||p_user_id::text,0)
  );
  if exists (
    select 1 from public.listening_room_messages m
    where m.user_id=p_user_id and m.created_at>now()-interval '2 seconds'
  ) or (
    select count(*) from public.listening_room_messages m
    where m.user_id=p_user_id and m.created_at>now()-interval '1 minute'
  ) >= 12 then
    raise exception 'Message rate limit' using errcode='P0001';
  end if;
  insert into public.listening_room_messages(room_id,user_id,body)
  values(p_room_id,p_user_id,btrim(p_body)) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.oddio_join_listening_room(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.oddio_room_transport(uuid,uuid,uuid,boolean,numeric) from public,anon,authenticated;
revoke all on function public.oddio_room_message(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.oddio_join_listening_room(uuid,uuid,text) to service_role;
grant execute on function public.oddio_room_transport(uuid,uuid,uuid,boolean,numeric) to service_role;
grant execute on function public.oddio_room_message(uuid,uuid,text) to service_role;
