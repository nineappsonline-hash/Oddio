-- In-app podcast notification data may only be touched by server-role APIs.
begin;
do $$
begin
  if pg_catalog.has_table_privilege('anon', 'public.podcast_notification_preferences', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_notification_preferences', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_notification_preferences', 'UPDATE')
    or pg_catalog.has_table_privilege('anon', 'public.podcast_notification_reads', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_notification_reads', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.podcast_notification_reads', 'INSERT') then
    raise exception 'Podcast notifications leaked to client Data API roles';
  end if;
  if not pg_catalog.has_table_privilege('service_role', 'public.podcast_notification_preferences', 'UPDATE')
    or not pg_catalog.has_table_privilege('service_role', 'public.podcast_notification_reads', 'INSERT') then
    raise exception 'Server role cannot persist notification state';
  end if;
  if not (select relrowsecurity from pg_class
     where oid = 'public.podcast_notification_preferences'::regclass)
     or not (select relrowsecurity from pg_class
     where oid = 'public.podcast_notification_reads'::regclass) then
    raise exception 'Podcast notification row-level security is disabled';
  end if;
end $$;
rollback;
