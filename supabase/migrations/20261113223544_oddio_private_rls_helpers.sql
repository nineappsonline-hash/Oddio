-- Move RLS helper functions out of the public Data API schema.
-- ALTER FUNCTION retains object OIDs used by existing RLS policies.
-- Run with CI RLS tests before applying to a live database.
begin;

create schema if not exists oddio_private;
revoke all on schema oddio_private from public;
grant usage on schema oddio_private to anon, authenticated, service_role;

alter function public.has_staff_role(public.staff_role[]) set schema oddio_private;
alter function public.is_admin() set schema oddio_private;
alter function public.is_staff() set schema oddio_private;
alter function public.is_super_admin() set schema oddio_private;
alter function public.owns_artist(uuid) set schema oddio_private;
alter function public.owns_track(uuid) set schema oddio_private;
alter function public.can_read_playlist(uuid) set schema oddio_private;
alter function public.can_read_track(uuid) set schema oddio_private;

-- Fix schema-qualified calls embedded in SQL helpers and privileged-field
-- trigger functions. Using pg_get_functiondef preserves trigger behavior and
-- SECURITY DEFINER properties while updating only the helper references.
do $body$
declare
  row record;
  definition text;
begin
  for row in
    select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (
       (n.nspname = 'oddio_private' and p.proname in (
         'is_admin', 'is_staff', 'is_super_admin',
         'can_read_track', 'can_read_playlist'
       ))
       or (n.nspname = 'public' and p.proname in (
         'guard_artist_privileged_fields',
         'guard_comment_status',
         'guard_track_privileged_fields'
       ))
     )
  loop
    definition := pg_get_functiondef(row.oid);
    definition := replace(definition, 'public.is_staff(', 'oddio_private.is_staff(');
    definition := replace(definition, 'public.has_staff_role(', 'oddio_private.has_staff_role(');
    execute definition;
  end loop;
end;
$body$;

-- The helpers still need to execute *inside* policies, but are no longer
-- reachable as /rest/v1/rpc/ endpoints when only public is exposed.
revoke execute on all functions in schema oddio_private from public;
grant execute on all functions in schema oddio_private to anon, authenticated, service_role;

-- Assert sensitive definer helpers no longer live in exposed public schema.
do $check$
begin
  if to_regprocedure('public.is_staff()') is not null
     or to_regprocedure('public.can_read_track(uuid)') is not null
     or to_regprocedure('public.has_staff_role(public.staff_role[])') is not null
  then
    raise exception 'RLS helper migration did not remove public RPC entry points';
  end if;
end;
$check$;
commit;
