-- Verify account-scoped history deletion cascades to raw playback events
-- without erasing another user's sessions. Disposable database only.
begin;

insert into auth.users(id,email,raw_user_meta_data)
values
 ('77000000-0000-4000-8000-000000000001','history-a@example.test','{"handle":"history-a"}'),
 ('77000000-0000-4000-8000-000000000002','history-b@example.test','{"handle":"history-b"}');

insert into public.genres(id,slug,label_en,label_ar)
values ('17000000-0000-4000-8000-000000000001','history-test-genre','History','سجل');
insert into public.artists(id,owner_user_id,slug,name)
values ('37000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000001','history-test-artist','History Artist');
insert into public.tracks(id,artist_id,title,slug,genre_id,review_status,publish_status,visibility,release_at)
values ('57000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001','History song','history-song','17000000-0000-4000-8000-000000000001','approved','published','public',now() - interval '1 day');

insert into public.playback_sessions(id,user_id)
values
 ('67000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000001'),
 ('67000000-0000-4000-8000-000000000002','77000000-0000-4000-8000-000000000002');
insert into public.playback_events(id,session_id,track_id,event_type,audible_ms,qualified,request_id)
values
 ('87000000-0000-4000-8000-000000000001','67000000-0000-4000-8000-000000000001','57000000-0000-4000-8000-000000000001','start',0,false,'history-a-event'),
 ('87000000-0000-4000-8000-000000000002','67000000-0000-4000-8000-000000000002','57000000-0000-4000-8000-000000000001','start',0,false,'history-b-event');

delete from public.playback_sessions
where user_id='77000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.playback_events where id='87000000-0000-4000-8000-000000000001') then
    raise exception 'Deleted owner event was retained';
  end if;
  if not exists (select 1 from public.playback_events where id='87000000-0000-4000-8000-000000000002') then
    raise exception 'Another owner event was deleted';
  end if;
end;
$$;

rollback;
