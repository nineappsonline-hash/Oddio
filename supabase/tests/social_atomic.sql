-- Transactional social RPC checks. Run only in disposable database after migrations.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
('71000000-0000-4000-8000-000000000001', 'social-listener@example.test', '{"handle":"sociallistener"}'),
('71000000-0000-4000-8000-000000000002', 'social-artist@example.test', '{"handle":"socialartist"}');

insert into public.genres (id, slug, label_en, label_ar)
values ('11000000-0000-4000-8000-000000000001', 'social-genre', 'Social Genre', 'اجتماعي');

insert into public.artists(id, owner_user_id, slug, name)
values ('31000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'social-artist', 'Social Artist');

insert into public.tracks
(id, artist_id, title, slug, genre_id, visibility, review_status, publish_status, release_at)
values
('51000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'Public Test', 'social-public',
'11000000-0000-4000-8000-000000000001', 'public','approved','published',now() - interval '1 day'),
('51000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 'Private Test', 'social-private',
'11000000-0000-4000-8000-000000000001', 'private','draft','unpublished',now() - interval '1 day');

insert into public.playlists (id, owner_id, title, visibility)
values ('61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','Public list','public');

do $$
declare
  listener uuid := '71000000-0000-4000-8000-000000000001';
  owner_id uuid := '71000000-0000-4000-8000-000000000002';
  track_id uuid := '51000000-0000-4000-8000-000000000001';
  private_track uuid := '51000000-0000-4000-8000-000000000002';
  artist_id uuid := '31000000-0000-4000-8000-000000000001';
  list_id uuid := '61000000-0000-4000-8000-000000000001';
begin
  if has_function_privilege('anon','public.oddio_toggle_track_like(uuid,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.oddio_toggle_track_like(uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.oddio_toggle_track_like(uuid,uuid)','EXECUTE')
  then raise exception 'RPC function execute grants invalid'; end if;

  if not public.oddio_toggle_track_like(listener,track_id) then
    raise exception 'First like must enable like'; end if;
  if public.oddio_toggle_track_like(listener,track_id) then
    raise exception 'Second like must remove like'; end if;
  if (select count(*) from public.likes where user_id=listener and track_id=track_id) <> 0 then
    raise exception 'Like row not removed'; end if;
  begin
    perform public.oddio_toggle_track_like(listener,private_track);
    raise exception 'Private track like unexpectedly allowed';
  exception when sqlstate 'P0002' then null;
  end;

  if not public.oddio_toggle_artist_follow(listener,artist_id) then
    raise exception 'Artist follow did not enable'; end if;
  if public.oddio_toggle_artist_follow(listener,artist_id) then
    raise exception 'Artist follow did not disable'; end if;

  if not public.oddio_toggle_playlist_follow(listener,list_id) then
    raise exception 'Playlist follow did not enable'; end if;
  if public.oddio_toggle_playlist_follow(listener,list_id) then
    raise exception 'Playlist follow did not disable'; end if;

  perform public.oddio_add_playlist_track(owner_id,list_id,track_id);
  perform public.oddio_add_playlist_track(owner_id,list_id,track_id);
  if (select count(*) from public.playlist_tracks where playlist_id=list_id) <> 1 then
    raise exception 'Duplicate playlist track was inserted'; end if;
  begin
    perform public.oddio_add_playlist_track(listener,list_id,track_id);
    raise exception 'Non-owner added to playlist';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.oddio_add_playlist_track(owner_id,list_id,private_track);
  exception when sqlstate 'P0002' then
    raise exception 'Owner must be allowed to add own private track';
  end;
end;
$$;
rollback;
