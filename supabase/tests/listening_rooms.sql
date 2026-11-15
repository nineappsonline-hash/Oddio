-- Run on CI disposable PostgreSQL after schema installation, never on production.
begin;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='listening_rooms' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='listening_room_members' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='listening_room_messages' and c.relrowsecurity
  ) then raise exception 'Listening room RLS missing'; end if;
  if has_table_privilege('anon','public.listening_rooms','SELECT')
    or has_table_privilege('authenticated','public.listening_room_members','SELECT')
    or has_table_privilege('authenticated','public.listening_room_messages','INSERT')
  then raise exception 'Room private data leaked to browser roles'; end if;
  if has_function_privilege('authenticated','public.oddio_join_listening_room(uuid,uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.oddio_room_transport(uuid,uuid,uuid,boolean,numeric)','EXECUTE')
    or has_function_privilege('authenticated','public.oddio_room_message(uuid,uuid,text)','EXECUTE')
  then raise exception 'Room RPC privileges leaked'; end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
('73000000-0000-4000-8000-000000000001','room-host@example.test','{"handle":"roomhost"}'),
('73000000-0000-4000-8000-000000000002','room-guest@example.test','{"handle":"roomguest"}'),
('73000000-0000-4000-8000-000000000003','room-stranger@example.test','{"handle":"roomstranger"}');

insert into public.genres(id,slug,label_en,label_ar) values
('13000000-0000-4000-8000-000000000001','room-genre','Room Genre','نوع الغرفة');
insert into public.artists(id,owner_user_id,slug,name) values
('33000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','room-artist','Room Artist');
insert into public.tracks
(id,artist_id,title,slug,genre_id,visibility,review_status,publish_status,release_at) values
('53000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','Room Public','room-public','13000000-0000-4000-8000-000000000001','public','approved','published',now()-interval '1 day'),
('53000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000001','Room Private','room-private','13000000-0000-4000-8000-000000000001','private','draft','unpublished',now()-interval '1 day');
insert into public.listening_rooms(id,host_id,title,code_hash)
values ('63000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',
'Room Night',repeat('a',64));

do $$
declare
 host uuid := '73000000-0000-4000-8000-000000000001';
 guest uuid := '73000000-0000-4000-8000-000000000002';
 outsider uuid := '73000000-0000-4000-8000-000000000003';
 room uuid := '63000000-0000-4000-8000-000000000001';
 public_track uuid := '53000000-0000-4000-8000-000000000001';
 private_track uuid := '53000000-0000-4000-8000-000000000002';
 msg bigint;
begin
  begin
    perform public.oddio_join_listening_room(guest,guest,repeat('a',64));
    raise exception 'Wrong room accepted';
  exception when sqlstate 'P0002' then null; end;
  begin
    perform public.oddio_join_listening_room(room,guest,repeat('b',64));
    raise exception 'Wrong invitation accepted';
  exception when sqlstate 'P0002' then null; end;

  perform public.oddio_join_listening_room(room,host,repeat('a',64));
  perform public.oddio_join_listening_room(room,guest,repeat('a',64));
  perform public.oddio_join_listening_room(room,guest,repeat('a',64));
  if (select count(*) from public.listening_room_members where room_id=room) <> 2
  then raise exception 'Joining twice created duplicate members'; end if;

  begin
    perform public.oddio_room_transport(room,guest,public_track,true,0);
    raise exception 'Guest controlled host transport';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.oddio_room_transport(room,host,private_track,true,0);
    raise exception 'Private/unapproved track played publicly';
  exception when sqlstate 'P0002' then null; end;
  if public.oddio_room_transport(room,host,public_track,true,12) <= 1
  then raise exception 'Host transport did not advance version'; end if;

  msg := public.oddio_room_message(room,guest,'Nice tune');
  if not exists(select 1 from public.listening_room_messages where id=msg and user_id=guest)
  then raise exception 'Member message not recorded'; end if;
  begin
    perform public.oddio_room_message(room,outsider,'Intruding');
    raise exception 'Outsider posted message';
  exception when sqlstate '42501' then null; end;
  update public.listening_room_members set muted=true
  where room_id=room and user_id=guest;
  begin
    perform public.oddio_room_message(room,guest,'Muted talk');
    raise exception 'Muted guest posted message';
  exception when sqlstate '42501' then null; end;
  update public.listening_room_members set banned=true where room_id=room and user_id=guest;
  begin
    perform public.oddio_join_listening_room(room,guest,repeat('a',64));
    raise exception 'Banned guest rejoined';
  exception when sqlstate '42501' then null; end;
end $$;
rollback;
