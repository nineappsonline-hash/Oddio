#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Use a disposable PostgreSQL database only}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" <<'SQL'
insert into auth.users(id,email,raw_user_meta_data) values
('72000000-0000-4000-8000-000000000001','parallel-listener@example.test','{"handle":"parallellistener"}'),
('72000000-0000-4000-8000-000000000002','parallel-owner@example.test','{"handle":"parallelowner"}');
insert into public.genres(id,slug,label_en,label_ar) values ('12000000-0000-4000-8000-000000000001','parallel-genre','Parallel','توازي');
insert into public.artists(id,owner_user_id,slug,name) values ('32000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','parallel-artist','Parallel Artist');
insert into public.tracks(id,artist_id,title,slug,genre_id,review_status,publish_status,visibility,release_at) values
('52000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','Parallel Track','parallel-track','12000000-0000-4000-8000-000000000001','approved','published','public',now()-interval '1 hour');
insert into public.playlists(id,owner_id,title,visibility) values ('62000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','Parallel Playlist','public');
SQL
pids=()
for i in {1..8}; do
  "${PSQL[@]}" -c "select public.oddio_toggle_track_like('72000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001');" >/dev/null & pids+=("$!")
  "${PSQL[@]}" -c "select public.oddio_toggle_artist_follow('72000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001');" >/dev/null & pids+=("$!")
  "${PSQL[@]}" -c "select public.oddio_toggle_playlist_follow('72000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001');" >/dev/null & pids+=("$!")
  "${PSQL[@]}" -c "select public.oddio_add_playlist_track('72000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001');" >/dev/null & pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
"${PSQL[@]}" <<'SQL'
do $$
begin
 if (select count(*) from public.likes where user_id='72000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Concurrent likes out of sync'; end if;
 if (select count(*) from public.artist_follows where user_id='72000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Concurrent artist follows out of sync'; end if;
 if (select count(*) from public.playlist_follows where user_id='72000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Concurrent playlist follows out of sync'; end if;
 if (select count(*) from public.playlist_tracks where playlist_id='62000000-0000-4000-8000-000000000001') <> 1 then raise exception 'Concurrent playlist adds duplicated'; end if;
end;
$$;
delete from auth.users where id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002');
delete from public.genres where id='12000000-0000-4000-8000-000000000001';
SQL
echo 'Parallel social operations passed.'
