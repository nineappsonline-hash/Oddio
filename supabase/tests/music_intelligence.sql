-- Phase 4: disposable PostgreSQL transaction only.
begin;

do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.audio_fingerprints', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.audio_fingerprints', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.audio_fingerprints', 'INSERT') then
    raise exception 'Spectral fingerprints must remain service-only';
  end if;
  if pg_catalog.has_function_privilege(
    'authenticated',
    'public.oddio_accept_music_tags(uuid,uuid,text,text[])',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'anon',
    'public.oddio_accept_music_tags(uuid,uuid,text,text[])',
    'EXECUTE'
  ) then
    raise exception 'Artist tag approval RPC must remain service-only';
  end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data)
values
 ('78000000-0000-4000-8000-000000000001','phase4-owner@example.test','{"handle":"phase4-owner"}'),
 ('78000000-0000-4000-8000-000000000002','phase4-other@example.test','{"handle":"phase4-other"}');

insert into public.genres(id,slug,label_en,label_ar)
values
 ('18000000-0000-4000-8000-000000000001','phase4-original','Original','أصلي'),
 ('18000000-0000-4000-8000-000000000002','phase4-suggested','Suggested','مقترح');
insert into public.moods(id,slug,label_en,label_ar)
values ('28000000-0000-4000-8000-000000000001','phase4-calm','Calm','هادئ');
insert into public.artists(id,owner_user_id,slug,name)
values ('38000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','phase4-artist','Phase 4 Artist');
insert into public.tracks(id,artist_id,title,slug,genre_id,audio_features)
values (
 '58000000-0000-4000-8000-000000000001',
 '38000000-0000-4000-8000-000000000001',
 'Audio tag review', 'audio-tag-review',
 '18000000-0000-4000-8000-000000000001',
 '{}'::jsonb
);
insert into public.audio_tag_suggestions(track_id,suggestion)
values (
 '58000000-0000-4000-8000-000000000001',
 '{"source":"artist-reviewed-local-model-v1","genreSlug":"phase4-suggested","moodSlugs":["phase4-calm"],"confidence":0.93}'::jsonb
);

do $$
begin
  begin
    perform public.oddio_accept_music_tags(
      '78000000-0000-4000-8000-000000000002',
      '58000000-0000-4000-8000-000000000001',
      'phase4-suggested', array['phase4-calm']
    );
    raise exception 'Other user was allowed to edit music tags';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.oddio_accept_music_tags(
      '78000000-0000-4000-8000-000000000001',
      '58000000-0000-4000-8000-000000000001',
      'phase4-original', array['phase4-calm']
    );
    raise exception 'Mismatch from stored model suggestion was accepted';
  exception when invalid_parameter_value then
    null;
  end;
end $$;

select public.oddio_accept_music_tags(
 '78000000-0000-4000-8000-000000000001',
 '58000000-0000-4000-8000-000000000001',
 'phase4-suggested', array['phase4-calm']
);

do $$
begin
  if not exists (
    select 1 from public.tracks t
    where t.id = '58000000-0000-4000-8000-000000000001'
      and t.genre_id = '18000000-0000-4000-8000-000000000002'
      and t.audio_features -> 'artistApprovedTags' ->> 'genreSlug' = 'phase4-suggested'
  ) then
    raise exception 'Artist-approved genre update was not saved';
  end if;
  if exists (
    select 1 from public.audio_tag_suggestions
    where track_id = '58000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Accepted private suggestion should be consumed';
  end if;
  if not exists (
    select 1 from public.track_moods
    where track_id = '58000000-0000-4000-8000-000000000001'
      and mood_id = '28000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Atomic mood update was not saved';
  end if;
end $$;

rollback;
