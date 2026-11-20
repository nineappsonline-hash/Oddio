-- Podcast progress is server-private. Browser tokens may neither read nor
-- write another listener's data, or execute the privileged merge function.
begin;
do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.podcast_listening_progress', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.podcast_listening_progress', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.podcast_listening_progress', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.podcast_listening_progress', 'UPDATE')
     or pg_catalog.has_table_privilege('authenticated', 'public.podcast_listening_progress', 'DELETE') then
    raise exception 'Podcast progress is exposed to browser roles';
  end if;
  if not pg_catalog.has_table_privilege('service_role','public.podcast_listening_progress','SELECT')
     or not pg_catalog.has_function_privilege(
       'service_role', 'public.merge_podcast_listening_progress(uuid,jsonb)', 'EXECUTE'
     ) then
    raise exception 'Service role cannot operate podcast progress';
  end if;
  if pg_catalog.has_function_privilege(
       'anon', 'public.merge_podcast_listening_progress(uuid,jsonb)', 'EXECUTE'
     ) or pg_catalog.has_function_privilege(
       'authenticated', 'public.merge_podcast_listening_progress(uuid,jsonb)', 'EXECUTE'
     ) then
    raise exception 'Browser roles can call podcast sync merge';
  end if;
  if not (select relrowsecurity from pg_class
          where oid = 'public.podcast_listening_progress'::regclass) then
    raise exception 'RLS must be enabled for podcast progress';
  end if;
end $$;
rollback;
