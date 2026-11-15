-- Phase 8 private offline-rights attestation grants (no client license granted).
begin;
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='track_offline_permissions'
      and c.relrowsecurity
  ) then raise exception 'Offline rights RLS is required'; end if;
  if has_table_privilege('authenticated','public.track_offline_permissions','SELECT')
    or has_table_privilege('authenticated','public.track_offline_permissions','UPDATE')
    or has_table_privilege('anon','public.track_offline_permissions','INSERT')
  then raise exception 'Offline rights must be service role only'; end if;
  if not has_table_privilege('service_role','public.track_offline_permissions','SELECT,INSERT,UPDATE')
  then raise exception 'Server offline rights access is missing'; end if;
end $$;
rollback;
