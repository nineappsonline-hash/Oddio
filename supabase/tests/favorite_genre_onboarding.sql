-- Run in disposable CI database only. RLS and one-time account completion.
begin;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.favorite_genre_onboarding'::regclass and relrowsecurity
  ) then raise exception 'Favorite genre onboarding RLS is disabled'; end if;
  if has_table_privilege('anon','public.favorite_genre_onboarding','SELECT')
    or has_table_privilege('authenticated','public.favorite_genre_onboarding','SELECT')
    or has_table_privilege('authenticated','public.favorite_genre_onboarding','INSERT')
  then raise exception 'Favorite genre onboarding must remain server-only'; end if;
  if not has_table_privilege('service_role','public.favorite_genre_onboarding','SELECT,INSERT,UPDATE,DELETE')
  then raise exception 'Server cannot persist genre onboarding'; end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data)
values ('79000000-0000-4000-8000-000000000071','genre-onboarding@example.test','{"handle":"genre-onboarding"}');

do $$
begin
  if exists (
    select 1 from public.favorite_genre_onboarding
    where user_id = '79000000-0000-4000-8000-000000000071'
  ) then raise exception 'New account must not be marked as onboarded automatically'; end if;
end $$;

insert into public.favorite_genre_onboarding (user_id,genre_ids,completed)
values ('79000000-0000-4000-8000-000000000071','{}'::uuid[],true);

do $$
begin
  if not exists (
    select 1 from public.favorite_genre_onboarding
    where user_id = '79000000-0000-4000-8000-000000000071'
      and completed and cardinality(genre_ids) = 0
  ) then raise exception 'Skipping should persist a completed selection'; end if;
  begin
    update public.favorite_genre_onboarding
    set genre_ids = array_fill('29000000-0000-4000-8000-000000000001'::uuid, array[4])
    where user_id = '79000000-0000-4000-8000-000000000071';
    raise exception 'Maximum three genres was bypassed';
  exception when check_violation then null;
  end;
end $$;

rollback;
