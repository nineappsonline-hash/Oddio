-- Phase 5 privacy checks. Run only on CI disposable PostgreSQL.
begin;

do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.discovery_preferences', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.discovery_preferences', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.discovery_preferences', 'INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.discovery_preferences', 'UPDATE')
    or pg_catalog.has_table_privilege('authenticated', 'public.discovery_preferences', 'DELETE')
  then
    raise exception 'Discovery exclusions must be service-only';
  end if;
  if not pg_catalog.has_table_privilege('service_role','public.discovery_preferences','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Service-side preference persistence must be allowed';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='discovery_preferences' and c.relrowsecurity
  ) then
    raise exception 'Discovery preference RLS missing';
  end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data)
values ('79000000-0000-4000-8000-000000000001','phase5-owner@example.test','{"handle":"phase5-owner"}');

insert into public.discovery_preferences(user_id,hidden_track_ids,hidden_genre_ids)
values (
 '79000000-0000-4000-8000-000000000001',
 array['59000000-0000-4000-8000-000000000001']::uuid[],
 array['19000000-0000-4000-8000-000000000001']::uuid[]
);

do $$
begin
 if not exists (
   select 1 from public.discovery_preferences
   where user_id='79000000-0000-4000-8000-000000000001'
     and cardinality(hidden_track_ids)=1
     and cardinality(hidden_genre_ids)=1
 ) then
   raise exception 'User-owned discovery preferences were not stored';
 end if;
 begin
   update public.discovery_preferences
     set hidden_track_ids = array_fill('59000000-0000-4000-8000-000000000001'::uuid,array[101])
   where user_id='79000000-0000-4000-8000-000000000001';
   raise exception 'Hidden-track limit was bypassed';
 exception when check_violation then null;
 end;
end $$;

rollback;
