-- Artist-review appeals: service-only and owner-scoped API prerequisite.
begin;
do $$
begin
  if not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='track_review_appeals' and c.relrowsecurity) then
    raise exception 'track_review_appeals RLS must be enabled';
  end if;
  if has_table_privilege('anon','public.track_review_appeals','SELECT')
    or has_table_privilege('authenticated','public.track_review_appeals','SELECT')
    or has_table_privilege('authenticated','public.track_review_appeals','INSERT')
    or has_table_privilege('authenticated','public.track_review_appeals','UPDATE') then
    raise exception 'Track review appeals must not be accessible from browser roles';
  end if;
  if not has_table_privilege('service_role','public.track_review_appeals','SELECT,INSERT,UPDATE') then
    raise exception 'Appeals API must have service-side persistence access';
  end if;
end $$;
rollback;
