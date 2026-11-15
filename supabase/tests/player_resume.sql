-- Verify new cross-device player state uses service-only access and
-- unambiguous user ownership. Disposable PostgreSQL database only.
begin;

do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.player_resume_states', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.player_resume_states', 'INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.player_resume_states', 'UPDATE')
    or pg_catalog.has_table_privilege('authenticated', 'public.player_resume_states', 'DELETE') then
    raise exception 'Player state must not be directly exposed to browser roles';
  end if;
  if not pg_catalog.has_table_privilege('service_role', 'public.player_resume_states', 'SELECT') then
    raise exception 'Server-side service role should read player state';
  end if;
end;
$$;

insert into auth.users(id,email,raw_user_meta_data)
values ('76000000-0000-4000-8000-000000000001','resume-owner@example.test','{"handle":"resume-owner"}');

insert into public.player_resume_states(user_id, current_time_seconds, queue_track_ids)
values ('76000000-0000-4000-8000-000000000001', 42, '{}');

do $$
declare
  count_rows integer;
begin
  select count(*) into count_rows
  from public.player_resume_states
  where user_id = '76000000-0000-4000-8000-000000000001' and current_time_seconds = 42;
  if count_rows <> 1 then
    raise exception 'Player state is not persisted by account id';
  end if;
end;
$$;

rollback;
