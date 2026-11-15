-- Phase 7 private playlist editor and invite permission guards.
begin;
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='playlist_collaborators' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='playlist_collaboration_invites' and c.relrowsecurity
  ) then raise exception 'Playlist collaboration private tables require RLS'; end if;
  if has_table_privilege('authenticated','public.playlist_collaborators','SELECT')
    or has_table_privilege('authenticated','public.playlist_collaboration_invites','SELECT')
    or has_table_privilege('anon','public.playlist_collaboration_invites','SELECT')
  then raise exception 'Browser clients must not read private collaboration data'; end if;
  if has_function_privilege('authenticated','public.oddio_join_playlist_invite(uuid,uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.oddio_collaborator_remove_playlist_track(uuid,uuid,uuid)','EXECUTE')
  then raise exception 'Collaboration RPCs must not be callable directly by browser roles'; end if;
  if not has_function_privilege('service_role','public.oddio_join_playlist_invite(uuid,uuid,text)','EXECUTE')
    or not has_function_privilege('service_role','public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid)','EXECUTE')
  then raise exception 'Server-side collaboration RPC grant is missing'; end if;
end $$;

insert into auth.users (id,email,raw_user_meta_data) values
('72000000-0000-4000-8000-000000000001','collab-owner@example.test','{"handle":"collabowner"}'),
('72000000-0000-4000-8000-000000000002','collab-editor@example.test','{"handle":"collabeditor"}'),
('72000000-0000-4000-8000-000000000003','collab-outsider@example.test','{"handle":"collaboutsider"}');

insert into public.genres (id,slug,label_en,label_ar)
values ('12000000-0000-4000-8000-000000000001','collab-genre','Collab','مشترك');
insert into public.artists (id,owner_user_id,slug,name)
values ('32000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','collab-artist','Collab Artist');
insert into public.tracks
(id,artist_id,title,slug,genre_id,visibility,review_status,publish_status,release_at)
values
('52000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','Collab Public','collab-public','12000000-0000-4000-8000-000000000001','public','approved','published',now()-interval '1 day'),
('52000000-0000-4000-8000-000000000002','32000000-0000-4000-8000-000000000001','Collab Private','collab-private','12000000-0000-4000-8000-000000000001','private','draft','unpublished',now()-interval '1 day');
insert into public.playlists (id,owner_id,title,visibility)
values
('62000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','Collab Public','public'),
('62000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001','Collab Other','public');
insert into public.playlist_collaboration_invites
(playlist_id,creator_id,code_hash,expires_at)
values ('62000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',repeat('a',64),now()+interval '1 day');

do $$
declare
  editor uuid := '72000000-0000-4000-8000-000000000002';
  outsider uuid := '72000000-0000-4000-8000-000000000003';
  public_list uuid := '62000000-0000-4000-8000-000000000001';
  wrong_list uuid := '62000000-0000-4000-8000-000000000002';
  public_track uuid := '52000000-0000-4000-8000-000000000001';
  private_track uuid := '52000000-0000-4000-8000-000000000002';
begin
  begin
    perform public.oddio_join_playlist_invite(editor,wrong_list,repeat('a',64));
    raise exception 'Invite unexpectedly joined a different playlist';
  exception when sqlstate 'P0002' then null;
  end;
  if public.oddio_join_playlist_invite(editor,public_list,repeat('a',64)) <> public_list then
    raise exception 'Editor did not join the expected playlist';
  end if;
  perform public.oddio_join_playlist_invite(editor,public_list,repeat('a',64));
  if (select use_count from public.playlist_collaboration_invites where code_hash=repeat('a',64)) <> 1 then
    raise exception 'Idempotent joining double counted invite uses';
  end if;
  perform public.oddio_collaborator_add_playlist_track(editor,public_list,public_track);
  perform public.oddio_collaborator_add_playlist_track(editor,public_list,public_track);
  if (select count(*) from public.playlist_tracks where playlist_id=public_list) <> 1 then
    raise exception 'Collaborator duplicate track was added';
  end if;
  begin
    perform public.oddio_collaborator_add_playlist_track(editor,public_list,private_track);
    raise exception 'Collaborator was allowed to expose private track';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.oddio_collaborator_add_playlist_track(outsider,public_list,public_track);
    raise exception 'Non-member added to playlist';
  exception when sqlstate 'P0002' then null;
  end;
  perform public.oddio_collaborator_remove_playlist_track(editor,public_list,public_track);
  if exists (select 1 from public.playlist_tracks where playlist_id=public_list) then
    raise exception 'Editor failed to remove playlist track';
  end if;
end $$;

rollback;
