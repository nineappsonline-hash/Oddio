-- Verify the production trigger is the sole source of qualified-play counters.
-- Disposable PostgreSQL test database only. Do not run against production.
begin;

insert into auth.users(id,email,raw_user_meta_data)
values ('73000000-0000-4000-8000-000000000001','qualified-owner@example.test','{"handle":"qualifiedowner"}');
insert into public.genres(id,slug,label_en,label_ar)
values ('13000000-0000-4000-8000-000000000001','qualified-genre','Qualified','تجريبي');
insert into public.artists(id,owner_user_id,slug,name)
values ('33000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','qualified-artist','Qualified Artist');
insert into public.tracks(id,artist_id,title,slug,genre_id,review_status,publish_status,visibility,release_at)
values ('53000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','Qualified Track','qualified-track','13000000-0000-4000-8000-000000000001','approved','published','public',now()-interval '1 day');
insert into public.playback_sessions(id,user_id)
values ('63000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001');
insert into public.playback_events
(id,session_id,track_id,event_type,audible_ms,qualified,request_id)
values ('83000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001','qualified',30000,true,'qualified-smoke');
do $$
begin
  if (select qualified_plays from public.tracks where id='53000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Qualified playback trigger must count once';
  end if;
  if (select qualified_plays from public.track_daily_stats where track_id='53000000-0000-4000-8000-000000000001' and country_code='') <> 1 then
    raise exception 'Qualified daily stats trigger must count once';
  end if;
end;
$$;
rollback;
