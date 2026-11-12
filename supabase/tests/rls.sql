-- Project AI Music — executable RLS / authorization tests.
--
-- Run against a database that has all migrations applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
--
-- Fixtures are created inside a transaction and rolled back at the end.
-- Assertions intentionally use the `authenticated` / `anon` roles so RLS is
-- exercised exactly as PostgREST would exercise it.

begin;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.eq(actual bigint, expected bigint, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL % — expected %, got %', label, expected, actual;
  end if;
end;
$$;

grant execute on function tests.eq(bigint, bigint, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fixtures (trusted role, bypasses RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-4000-8000-000000000001', 'listener@example.test', '{"handle":"listener","display_name":"Listener"}'),
  ('70000000-0000-4000-8000-000000000002', 'owner@example.test', '{"handle":"owner","display_name":"Owner"}'),
  ('70000000-0000-4000-8000-000000000003', 'other@example.test', '{"handle":"other","display_name":"Other"}'),
  ('70000000-0000-4000-8000-000000000004', 'admin@example.test', '{"handle":"admin","display_name":"Admin"}');

insert into public.staff_roles (user_id, role)
values ('70000000-0000-4000-8000-000000000004', 'super_admin');

insert into public.genres (id, slug, label_en, label_ar)
values ('10000000-0000-4000-8000-000000000001', 'rls-test', 'RLS Test', 'اختبار');

insert into public.artists (id, owner_user_id, slug, name)
values
  ('30000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'owner-artist', 'Owner Artist'),
  ('30000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000003', 'other-artist', 'Other Artist');

insert into public.tracks
  (id, artist_id, title, slug, genre_id, visibility, review_status, publish_status, release_at)
values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Public', 'public', '10000000-0000-4000-8000-000000000001', 'public', 'approved', 'published', now() - interval '1 day'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Private', 'private', '10000000-0000-4000-8000-000000000001', 'private', 'approved', 'published', now() - interval '1 day'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Scheduled', 'scheduled', '10000000-0000-4000-8000-000000000001', 'public', 'approved', 'scheduled', now() + interval '1 day'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Pending', 'pending', '10000000-0000-4000-8000-000000000001', 'public', 'pending_review', 'unpublished', now() - interval '1 day'),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'Unlisted', 'unlisted', '10000000-0000-4000-8000-000000000001', 'unlisted', 'approved', 'published', now() - interval '1 day'),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'Future', 'future', '10000000-0000-4000-8000-000000000001', 'public', 'approved', 'published', now() + interval '2 days');

insert into public.comments (id, user_id, track_id, body, status) values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Visible comment', 'visible'),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Hidden comment', 'hidden');

insert into public.playlists (id, owner_id, title, visibility) values
  ('60000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Public mix', 'public'),
  ('60000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'Listener private', 'private'),
  ('60000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'Owner private', 'private');

insert into public.likes (user_id, track_id)
values ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001');

insert into public.artist_follows (user_id, artist_id) values
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001');

insert into public.notifications (id, user_id, type, title, body)
values ('f0000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'system', 'Hello', 'Body');

insert into public.notification_preferences (user_id, email_opt_in, release_alerts)
values ('70000000-0000-4000-8000-000000000001', true, false)
on conflict (user_id) do update set email_opt_in = true, release_alerts = false;

insert into public.notification_preferences (user_id, email_opt_in, release_alerts)
values ('70000000-0000-4000-8000-000000000003', false, true)
on conflict (user_id) do update set email_opt_in = false, release_alerts = true;

insert into public.notifications (id, user_id, type, title, body) values
  ('f0000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'track_review_decision', 'Opted in', 'Delivery queued'),
  ('f0000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'track_review_decision', 'Not opted in', 'No delivery');

select tests.eq((select count(*) from public.email_deliveries), 1, 'email outbox respects opt-in');
select tests.eq((select count(*) from public.email_deliveries where to_email = 'listener@example.test'), 1, 'email outbox targets auth email');

insert into public.reports (id, reporter_id, target_type, target_id, reason)
values ('a0000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'track', '50000000-0000-4000-8000-000000000001', 'spam');

insert into public.upload_quotas (owner_id, daily_limit)
values ('70000000-0000-4000-8000-000000000001', 3);

insert into public.artist_applications (id, applicant_id, display_name, description, contact_email, rights_declared, status)
values ('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Listener', 'A sufficiently long artist description for validation.', 'listener@example.test', true, 'submitted');

insert into public.verification_requests (id, artist_id, requester_id, evidence)
values ('b0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'Evidence');

insert into public.audit_logs (actor_id, action, entity_type, entity_id)
values ('70000000-0000-4000-8000-000000000004', 'test.seed', 'track', '50000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select tests.eq((select count(*) from public.tracks), 2, 'anon sees public + unlisted released tracks');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000002'), 0, 'anon cannot read private track');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000003'), 0, 'anon cannot read scheduled track');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000004'), 0, 'anon cannot read pending track');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000005'), 1, 'anon can open unlisted track by id');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000006'), 0, 'future release stays hidden');
select tests.eq((select count(*) from public.playlists), 1, 'anon sees only public playlists');
select tests.eq((select count(*) from public.comments), 1, 'anon sees only visible comments');
select tests.eq((select count(*) from public.playback_sessions), 0, 'anon cannot read playback sessions');
select tests.eq((select count(*) from public.playback_events), 0, 'anon cannot read playback events');
select tests.eq((select count(*) from public.jobs), 0, 'anon cannot read jobs');
select tests.eq((select count(*) from public.audit_logs), 0, 'anon cannot read audit logs');
select tests.eq((select count(*) from public.notifications), 0, 'anon cannot read notifications');
select tests.eq((select count(*) from public.reports), 0, 'anon cannot read reports');
select tests.eq((select count(*) from public.upload_quotas), 0, 'anon cannot read quotas');
select tests.eq((select count(*) from public.artist_applications), 0, 'anon cannot read applications');
select tests.eq((select count(*) from public.email_deliveries), 0, 'anon cannot read email outbox');

do $$
begin
  begin
    insert into public.profile_settings (user_id, settings)
    values ('70000000-0000-4000-8000-000000000001', '{"x":1}'::jsonb);
    raise exception 'FAIL anon inserted private profile settings';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.tracks (artist_id, title, slug, genre_id)
    values ('30000000-0000-4000-8000-000000000001', 'Hack', 'hack', '10000000-0000-4000-8000-000000000001');
    raise exception 'FAIL anon inserted a track';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Listener
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);

select tests.eq((select count(*) from public.tracks), 2, 'listener sees released catalog only');
select tests.eq((select count(*) from public.playlists), 2, 'listener sees public + own private playlists');
select tests.eq((select count(*) from public.likes), 1, 'listener sees own like only');
select tests.eq((select count(*) from public.notifications), 2, 'listener sees own notifications');
select tests.eq((select count(*) from public.reports), 1, 'listener sees own report');
select tests.eq((select count(*) from public.upload_quotas), 1, 'listener sees own quota');
select tests.eq((select count(*) from public.artist_applications), 1, 'listener sees own application');
select tests.eq((select count(*) from public.comments), 2, 'listener sees own hidden comment too');

insert into public.playlists (id, owner_id, title, visibility)
values ('60000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000001', 'Mine', 'private');
select tests.eq((select count(*) from public.playlists), 3, 'listener created an owned playlist');

do $$
begin
  begin
    insert into public.playlists (id, owner_id, title, visibility)
    values ('60000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000002', 'Not mine', 'public');
    raise exception 'FAIL listener created a playlist for another user';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.comments (user_id, track_id, body)
    values ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Sneaky');
    raise exception 'FAIL listener commented on a private track';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    update public.profiles set display_name = 'Hacked'
     where id = '70000000-0000-4000-8000-000000000002';
  end;
  if exists (select 1 from public.profiles where id = '70000000-0000-4000-8000-000000000002' and display_name = 'Hacked') then
    raise exception 'FAIL listener edited another profile';
  end if;
end;
$$;

insert into public.profile_settings (user_id, settings)
values ('70000000-0000-4000-8000-000000000001', '{"theme":"dark"}'::jsonb)
on conflict (user_id) do update set settings = excluded.settings;

select tests.eq((select count(*) from public.profile_settings), 1, 'listener sees own private settings');

reset role;

-- ---------------------------------------------------------------------------
-- Artist owner
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);

select tests.eq((select count(*) from public.tracks), 5, 'owner sees own private/scheduled/future tracks');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000002'), 1, 'owner sees own private track');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000004'), 0, 'owner cannot see another artist pending track');
select tests.eq((select count(*) from public.audio_assets), 0, 'owner sees no foreign audio assets');

update public.artists set bio = 'New bio' where id = '30000000-0000-4000-8000-000000000001';
select tests.eq((select count(*) from public.artists where bio = 'New bio'), 1, 'owner edits own artist');

update public.tracks set title = 'Public edited' where id = '50000000-0000-4000-8000-000000000001';
select tests.eq((select count(*) from public.tracks where title = 'Public edited'), 1, 'owner edits own track');

do $$
begin
  begin
    update public.artists set verification_status = 'approved'
     where id = '30000000-0000-4000-8000-000000000001';
    raise exception 'FAIL owner self-verified artist';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    update public.tracks set review_status = 'rejected'
     where id = '50000000-0000-4000-8000-000000000001';
    raise exception 'FAIL owner changed review state';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    update public.artists set bio = 'Stolen'
     where id = '30000000-0000-4000-8000-000000000002';
  end;
  if exists (select 1 from public.artists where id = '30000000-0000-4000-8000-000000000002' and bio = 'Stolen') then
    raise exception 'FAIL owner edited another artist';
  end if;
end;
$$;

select tests.eq((select count(*) from public.reports), 0, 'artist cannot read listener reports');

reset role;

-- ---------------------------------------------------------------------------
-- Other artist
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000003', true);

select tests.eq((select count(*) from public.tracks), 3, 'other artist sees public, unlisted and own pending track');
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000002'), 0, 'other artist cannot see private track');

reset role;

-- ---------------------------------------------------------------------------
-- Administrator
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000004', true);

select tests.eq((select count(*) from public.tracks), 6, 'admin sees every track');
select tests.eq((select count(*) from public.reports), 1, 'admin sees reports');
select tests.eq((select count(*) from public.audit_logs), 1, 'admin sees audit logs');
select tests.eq((select count(*) from public.artist_applications), 1, 'admin sees applications');
select tests.eq((select count(*) from public.verification_requests), 1, 'admin sees verification requests');
select tests.eq((select count(*) from public.staff_roles), 1, 'admin sees staff roles');

update public.artists set verification_status = 'approved'
 where id = '30000000-0000-4000-8000-000000000001';
select tests.eq((select count(*) from public.artists where verification_status = 'approved'), 1, 'admin verifies artist');

update public.tracks set review_status = 'approved', publish_status = 'published'
 where id = '50000000-0000-4000-8000-000000000004';
select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000004' and review_status = 'approved'), 1, 'admin approves track');

reset role;

-- ---------------------------------------------------------------------------
-- Counters, qualified plays and scheduled publication
-- ---------------------------------------------------------------------------

insert into public.comments (id, user_id, track_id, body, status)
values ('80000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'Counter comment', 'visible');

select tests.eq((select comment_count from public.tracks where id = '50000000-0000-4000-8000-000000000001'), 2, 'visible comment counter');

insert into public.likes (user_id, track_id)
values ('70000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001');

select tests.eq((select like_count from public.tracks where id = '50000000-0000-4000-8000-000000000001'), 2, 'like counter');

insert into public.playback_sessions (id, user_id, anonymous_session_hash)
values ('aa000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', null);

insert into public.playback_events (session_id, track_id, event_type, audible_ms, qualified, request_id)
values ('aa000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'qualified', 31000, true, 'req-1');

select tests.eq((select qualified_plays from public.tracks where id = '50000000-0000-4000-8000-000000000001'), 1, 'qualified play counter');
select tests.eq((select qualified_plays from public.track_daily_stats where track_id = '50000000-0000-4000-8000-000000000001'), 1, 'daily stats counter');

do $$
begin
  begin
    insert into public.playback_events (session_id, track_id, event_type, audible_ms, qualified, request_id)
    values ('aa000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'qualified', 31000, true, 'req-2');
    raise exception 'FAIL duplicate qualified play was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;

update public.tracks set release_at = now() - interval '1 minute'
 where id = '50000000-0000-4000-8000-000000000003';

set local role service_role;
select tests.eq((select count(*) from public.promote_scheduled_tracks()), 1, 'scheduled track promoted once');
select tests.eq((select count(*) from public.promote_scheduled_tracks()), 0, 'scheduled publication is idempotent');
reset role;

select tests.eq((select count(*) from public.tracks where id = '50000000-0000-4000-8000-000000000003' and publish_status = 'published'), 1, 'scheduled track is published');
select tests.eq((
  select count(*) from public.notifications
  where user_id = '70000000-0000-4000-8000-000000000003'
    and type = 'new_release'
    and payload ->> 'trackId' = '50000000-0000-4000-8000-000000000003'
), 1, 'follower receives exactly one release notification');
select tests.eq((
  select count(*) from public.notifications
  where user_id = '70000000-0000-4000-8000-000000000001'
    and type = 'new_release'
), 0, 'release-alert opt-out suppresses fan-out');

set local role service_role;
select tests.eq((select count(*) from public.claim_emails(10)), 1, 'worker claims opted-in email');
select public.complete_email(
  (select id from public.email_deliveries where notification_id = 'f0000000-0000-4000-8000-000000000002'),
  'provider-test-id'
);
select tests.eq((select count(*) from public.email_deliveries where status = 'sent' and provider_message_id = 'provider-test-id'), 1, 'worker marks email sent');
reset role;

rollback;