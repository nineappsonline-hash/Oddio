-- Manual artist approval of reviewed classifier suggestions.
-- Only service_role can call this function from an authenticated server route.
-- Genre and mood are updated together inside one PostgreSQL transaction.
create or replace function public.oddio_accept_music_tags(
  p_user_id uuid,
  p_track_id uuid,
  p_genre_slug text,
  p_mood_slugs text[]
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_track public.tracks%rowtype;
  selected_genre uuid;
  selected_moods uuid[];
  suggested jsonb;
begin
  select t.* into current_track
  from public.tracks t
  join public.artists a on a.id = t.artist_id
  where t.id = p_track_id and a.owner_user_id = p_user_id
  for update of t;
  if not found then
    raise exception 'Track not owned by actor' using errcode = '42501';
  end if;
  if current_track.publish_status <> 'unpublished'
    or current_track.review_status not in ('draft', 'ready_for_review', 'changes_requested') then
    raise exception 'Only unpublished editable tracks may change tags'
      using errcode = '42501';
  end if;
  select s.suggestion into suggested
  from public.audio_tag_suggestions s where s.track_id = p_track_id;
  if suggested is null
    or suggested ->> 'source' <> 'artist-reviewed-local-model-v1'
    or suggested ->> 'genreSlug' is distinct from p_genre_slug
    or suggested -> 'moodSlugs' is distinct from to_jsonb(p_mood_slugs)
  then
    raise exception 'Tags must match the saved suggestion'
      using errcode = '22023';
  end if;
  if jsonb_typeof(current_track.audio_features -> 'artistApprovedTags') = 'object' then
    raise exception 'This suggestion has already been reviewed'
      using errcode = '22023';
  end if;
  select g.id into selected_genre
  from public.genres g
  where g.slug = p_genre_slug and g.active;
  if selected_genre is null then
    raise exception 'Genre is unavailable' using errcode = '22023';
  end if;
  if cardinality(p_mood_slugs) > 5 or
    cardinality(p_mood_slugs) <> (
      select count(distinct m.slug)
      from public.moods m
      where m.active and m.slug = any(p_mood_slugs)
    ) then
    raise exception 'Mood selection is invalid' using errcode = '22023';
  end if;
  select coalesce(array_agg(m.id), '{}'::uuid[]) into selected_moods
  from public.moods m where m.slug = any(p_mood_slugs) and m.active;
  update public.tracks
  set genre_id = selected_genre,
      genre_ids = array[selected_genre],
      audio_features = jsonb_set(
        current_track.audio_features, '{artistApprovedTags}',
        jsonb_build_object(
          'genreSlug', p_genre_slug,
          'moodSlugs', to_jsonb(p_mood_slugs),
          'approvedAt', now()
        ), true
      ),
      updated_at = now()
  where id = p_track_id;
  delete from public.track_moods where track_id = p_track_id;
  insert into public.track_moods(track_id, mood_id)
  select p_track_id, unnest(selected_moods);
  delete from public.audio_tag_suggestions where track_id = p_track_id;
end;
$$;

revoke all on function public.oddio_accept_music_tags(uuid,uuid,text,text[]) from public, anon, authenticated;
grant execute on function public.oddio_accept_music_tags(uuid,uuid,text,text[]) to service_role;
