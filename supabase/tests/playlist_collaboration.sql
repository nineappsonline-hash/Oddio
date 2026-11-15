-- Phase 7 private playlist editor and invite permission guards.
begin;
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='playlist_collaborators' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='playlist_collaboration_invites' and c.relrowsecurity
  ) then raise exception 'Playlist collaboration private tables require RLS'; end if;
  if has_table_privilege('authenticated','public.playlist_collaborators','SELECT')
    or has_table_privilege('authenticated','public.playlist_collaboration_invites','SELECT')
    or has_table_privilege('anon','public.playlist_collaboration_invites','SELECT')
  then raise exception 'Browser clients must not read private collaboration data'; end if;
  if has_function_privilege('authenticated','public.oddio_join_playlist_invite(uuid,uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.oddio_collaborator_remove_playlist_track(uuid,uuid,uuid)','EXECUTE')
  then raise exception 'Collaboration RPCs must not be callable directly by browser roles'; end if;
  if not has_function_privilege('service_role','public.oddio_join_playlist_invite(uuid,uuid,text)','EXECUTE')
    or not has_function_privilege('service_role','public.oddio_collaborator_add_playlist_track(uuid,uuid,uuid)','EXECUTE')
  then raise exception 'Server-side collaboration RPC grant is missing'; end if;
end $$;
rollback;
