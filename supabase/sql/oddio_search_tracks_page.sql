-- Oddio server-side paged search. Invoke from the Next.js server with the
-- Supabase service-role client; never expose privileged credentials to a browser.
create or replace function public.oddio_search_tracks_page(
  p_query text default '',
  p_genre_id uuid default null,
  p_mood_id uuid default null,
  p_language text default null,
  p_country text default null,
  p_sort text default 'relevant',
  p_offset integer default 0,
  p_limit integer default 25,
  p_arabic_only boolean default false
)
returns table(track_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $function$
  with args as (
    select left(trim(coalesce(p_query, '')), 160) as term,
      greatest(0, least(coalesce(p_offset, 0), 100000)) as skip,
      greatest(1, least(coalesce(p_limit, 25), 50)) as take
  ), matches as (
    select t.id, t.qualified_plays, t.release_at,
      case when a.term = '' then 0::real else
        (case when lower(t.title) = lower(a.term) then 100 else 0 end) +
        (case when lower(ar.name) = lower(a.term) then 80 else 0 end) +
        (case when lower(t.title) like lower(a.term) || '%' then 50 else 0 end) +
        (case when lower(ar.name) like lower(a.term) || '%' then 40 else 0 end) +
        (ts_rank_cd(t.search_vector, websearch_to_tsquery('simple', a.term)) * 10)
      end as rank_score
    from public.tracks t
    join public.artists ar on ar.id = t.artist_id
    cross join args a
    where t.review_status = 'approved'
      and t.publish_status = 'published'
      and t.visibility = 'public'
      and t.release_at <= now()
      and (p_genre_id is null or t.genre_id = p_genre_id or p_genre_id = any(t.genre_ids))
      and (p_mood_id is null or exists (
        select 1 from public.track_moods tm where tm.track_id = t.id and tm.mood_id = p_mood_id
      ))
      and (nullif(p_language, '') is null or t.language_code = p_language)
      and (nullif(p_country, '') is null or t.country_code = p_country)
      and (not p_arabic_only or t.language_code ~* '^ar([-_]|$)')
      and (
        a.term = ''
        or t.search_vector @@ websearch_to_tsquery('simple', a.term)
        or t.title ilike '%' || a.term || '%'
        or ar.name ilike '%' || a.term || '%'
        or array_to_string(ar.search_aliases, ' ') ilike '%' || a.term || '%'
        or exists (
          select 1 from public.genres g
          where (g.id = t.genre_id or g.id = any(t.genre_ids))
            and (g.label_en ilike '%' || a.term || '%' or g.label_ar ilike '%' || a.term || '%')
        )
        or exists (
          select 1 from public.track_moods tm
          join public.moods mo on mo.id = tm.mood_id
          where tm.track_id = t.id
            and (mo.label_en ilike '%' || a.term || '%' or mo.label_ar ilike '%' || a.term || '%')
        )
        or exists (
          select 1 from public.albums al
          where al.id = t.album_id and al.title ilike '%' || a.term || '%'
        )
      )
  )
  select m.id as track_id, count(*) over () as total_count
  from matches m cross join args a
  order by
    case when p_sort = 'newest' then m.release_at end desc nulls last,
    case when p_sort = 'popular' then m.qualified_plays end desc nulls last,
    case when p_sort not in ('newest','popular') then m.rank_score end desc nulls last,
    m.qualified_plays desc, m.id asc
  offset (select skip from args)
  limit (select take from args);
$function$;

revoke all on function public.oddio_search_tracks_page(text,uuid,uuid,text,text,text,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.oddio_search_tracks_page(text,uuid,uuid,text,text,text,integer,integer,boolean) to service_role;
