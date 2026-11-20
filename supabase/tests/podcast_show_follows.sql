-- Browser roles must not read or mutate follows through the Data API.
begin;
do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.podcast_show_follows', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_show_follows', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_show_follows', 'INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_show_follows', 'DELETE') then
    raise exception 'Podcast show follow table is exposed to browser roles';
  end if;
  if not pg_catalog.has_table_privilege('service_role', 'public.podcast_show_follows', 'SELECT')
    or not pg_catalog.has_table_privilege('service_role', 'public.podcast_show_follows', 'INSERT')
    or not pg_catalog.has_table_privilege('service_role', 'public.podcast_show_follows', 'DELETE') then
    raise exception 'Service role must be able to manage follows';
  end if;
  if not (select relrowsecurity from pg_class
    where oid = 'public.podcast_show_follows'::regclass) then
    raise exception 'Podcast show follow RLS must be enabled';
  end if;
end $$;
rollback;
