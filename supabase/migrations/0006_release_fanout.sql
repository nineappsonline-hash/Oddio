-- Project AI Music — one in-app release notification per follower per track.
--
-- Fires when a track actually becomes publicly published (including scheduled
-- releases promoted by the worker). Unlisted/private releases are not announced.
-- The opt-in email outbox from 0005 consumes these notifications automatically.

create or replace function public.notify_followers_on_release()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  artist_name text;
  owner_id uuid;
begin
  if new.publish_status <> 'published'
     or new.review_status <> 'approved'
     or new.visibility <> 'public'
     or new.release_at > now() then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.publish_status = 'published'
     and old.visibility = 'public'
     and old.release_at <= now() then
    return new;
  end if;

  select a.name, a.owner_user_id
    into artist_name, owner_id
    from public.artists a
   where a.id = new.artist_id;

  if artist_name is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, payload)
  select
    af.user_id,
    'new_release',
    format('%s released “%s”', artist_name, new.title),
    'An artist you follow has a new release.',
    jsonb_build_object('trackId', new.id, 'artistId', new.artist_id)
  from public.artist_follows af
  left join public.notification_preferences np on np.user_id = af.user_id
  where af.artist_id = new.artist_id
    and af.user_id <> owner_id
    and coalesce(np.release_alerts, true) is true
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = af.user_id
        and n.type = 'new_release'
        and n.payload ->> 'trackId' = new.id::text
    );

  return new;
end;
$$;

create trigger tracks_release_fanout
after insert or update of publish_status on public.tracks
for each row execute function public.notify_followers_on_release();

revoke all on function public.notify_followers_on_release() from public;