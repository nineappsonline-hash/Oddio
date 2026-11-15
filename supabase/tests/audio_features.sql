-- Phase 4 is deliberately separate from editorial genre/mood metadata.
-- All assertions run on disposable PostgreSQL; no production audio is read.
begin;
do $$
declare
  type_name text;
  check_exists boolean;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into type_name
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.tracks'::regclass
    and a.attname = 'audio_features'
    and not a.attisdropped;
  if type_name is distinct from 'jsonb' then
    raise exception 'Expected tracks.audio_features JSONB, got %', type_name;
  end if;
  select exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.tracks'::regclass
      and conname = 'oddio_audio_features_object'
  ) into check_exists;
  if not check_exists then
    raise exception 'Audio feature payload type check missing';
  end if;
  if not pg_catalog.row_security_active('public.tracks'::regclass) and
     not exists (
       select 1 from pg_catalog.pg_class
       where oid = 'public.tracks'::regclass and relrowsecurity
     ) then
    raise exception 'Track table RLS was disabled by Phase 4 migration';
  end if;
end $$;
rollback;
