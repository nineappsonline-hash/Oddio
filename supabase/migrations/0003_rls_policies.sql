-- Project AI Music — Row Level Security.
-- Every table is locked down by default; the service role (trusted server) bypasses RLS.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'profile_settings', 'staff_roles', 'artist_applications', 'artists', 'artist_social_links',
    'genres', 'moods', 'albums', 'tracks', 'track_moods', 'audio_assets',
    'artwork_assets', 'track_reviews', 'upload_quotas', 'upload_events', 'likes',
    'artist_follows', 'comments', 'playlists', 'playlist_tracks', 'playlist_follows',
    'playback_sessions', 'playback_events', 'track_daily_stats', 'notifications',
    'notification_preferences', 'reports', 'verification_requests', 'featured_slots',
    'audit_logs', 'jobs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create policy profiles_public_read on public.profiles
  for select using (true);

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Column privileges keep auth-only columns out of public reads even though RLS
-- is row-based. Service role is unaffected.
revoke all on public.profiles from anon, authenticated;
grant select (id, handle, display_name, avatar_key, locale, country, created_at)
  on public.profiles to anon, authenticated;
grant update (handle, display_name, avatar_key, locale, country)
  on public.profiles to authenticated;
grant all on public.profiles to service_role;

create policy profile_settings_own on public.profile_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy staff_roles_read_own_or_staff on public.staff_roles
  for select using (user_id = auth.uid() or public.is_staff());

-- Role grants are written only by the trusted server (service role).

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

create policy genres_public_read on public.genres
  for select using (true);

create policy genres_admin_write on public.genres
  for all using (public.is_admin()) with check (public.is_admin());

create policy moods_public_read on public.moods
  for select using (true);

create policy moods_admin_write on public.moods
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Artist onboarding
-- ---------------------------------------------------------------------------

create policy applications_read_own_or_staff on public.artist_applications
  for select using (applicant_id = auth.uid() or public.is_staff());

create policy applications_insert_own on public.artist_applications
  for insert with check (applicant_id = auth.uid());

create policy applications_update_own_editable on public.artist_applications
  for update
  using (applicant_id = auth.uid() and status in ('draft', 'needs_information'))
  with check (applicant_id = auth.uid() and status in ('draft', 'submitted'));

create policy applications_review_staff on public.artist_applications
  for update
  using (public.is_admin())
  with check (public.is_admin() and reviewer_id = auth.uid() and applicant_id <> auth.uid());

-- ---------------------------------------------------------------------------
-- Artists and social links
-- ---------------------------------------------------------------------------

create policy artists_public_read on public.artists
  for select using (true);

create policy artists_insert_approved_applicant on public.artists
  for insert with check (
    public.is_admin()
    or (
      owner_user_id = auth.uid()
      and exists (
        select 1 from public.artist_applications a
        where a.applicant_id = auth.uid() and a.status = 'approved'
      )
    )
  );

create policy artists_update_owner_or_admin on public.artists
  for update using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());

create policy artists_delete_admin on public.artists
  for delete using (public.is_super_admin());

create policy social_links_public_read on public.artist_social_links
  for select using (true);

create policy social_links_owner_write on public.artist_social_links
  for all using (public.owns_artist(artist_id) or public.is_admin())
  with check (public.owns_artist(artist_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Albums
-- ---------------------------------------------------------------------------

create policy albums_public_read on public.albums
  for select using (
    (
      status = 'published'
      and visibility in ('public', 'unlisted')
      and release_at <= now()
    )
    or public.owns_artist(artist_id)
    or public.is_staff()
  );

create policy albums_owner_write on public.albums
  for all using (public.owns_artist(artist_id) or public.is_admin())
  with check (public.owns_artist(artist_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Tracks
-- ---------------------------------------------------------------------------

create policy tracks_read on public.tracks
  for select using (public.can_read_track(id));

create policy tracks_owner_insert on public.tracks
  for insert with check (public.owns_artist(artist_id) or public.is_admin());

create policy tracks_owner_update on public.tracks
  for update using (public.owns_track(id) or public.is_admin())
  with check (public.owns_track(id) or public.is_admin());

create policy tracks_owner_delete on public.tracks
  for delete using (public.owns_track(id) or public.is_admin());

create policy track_moods_read on public.track_moods
  for select using (public.can_read_track(track_id));

create policy track_moods_owner_write on public.track_moods
  for all using (public.owns_track(track_id) or public.is_admin())
  with check (public.owns_track(track_id) or public.is_admin());

-- Audio object keys never reach the client. Only owners and staff may inspect
-- asset rows; playback is brokered by the server with signed tokens.
create policy audio_assets_owner_read on public.audio_assets
  for select using (public.owns_track(track_id) or public.is_staff());

create policy artwork_assets_owner_read on public.artwork_assets
  for select using (owner_id = auth.uid() or public.is_staff());

create policy artwork_assets_owner_write on public.artwork_assets
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Reviews, quotas, upload events
-- ---------------------------------------------------------------------------

create policy track_reviews_owner_or_staff_read on public.track_reviews
  for select using (public.owns_track(track_id) or public.is_staff());

create policy track_reviews_admin_insert on public.track_reviews
  for insert with check (public.is_admin() and reviewer_id = auth.uid());

create policy upload_quotas_owner_read on public.upload_quotas
  for select using (owner_id = auth.uid() or public.is_staff());

create policy upload_events_owner_read on public.upload_events
  for select using (user_id = auth.uid() or public.is_staff());

-- Quota and upload-event writes happen in trusted server code only.

-- ---------------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------------

create policy likes_read_own_or_staff on public.likes
  for select using (user_id = auth.uid() or public.is_staff());

create policy likes_write_own on public.likes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy artist_follows_read_own_or_staff on public.artist_follows
  for select using (user_id = auth.uid() or public.is_staff());

create policy artist_follows_write_own on public.artist_follows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy comments_read on public.comments
  for select using (
    (status = 'visible' and public.can_read_track(track_id))
    or user_id = auth.uid()
    or public.is_staff()
  );

create policy comments_insert_own on public.comments
  for insert with check (
    user_id = auth.uid()
    and status = 'visible'
    and public.can_read_track(track_id)
  );

create policy comments_update_own_body on public.comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy comments_moderate_staff on public.comments
  for update using (public.is_staff()) with check (public.is_staff());

create policy comments_delete_staff on public.comments
  for delete using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Playlists
-- ---------------------------------------------------------------------------

create policy playlists_read on public.playlists
  for select using (public.can_read_playlist(id));

create policy playlists_insert_own on public.playlists
  for insert with check (owner_id = auth.uid());

create policy playlists_update_own on public.playlists
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy playlists_delete_own on public.playlists
  for delete using (owner_id = auth.uid() or public.is_admin());

create policy playlist_tracks_read on public.playlist_tracks
  for select using (public.can_read_playlist(playlist_id));

create policy playlist_tracks_owner_write on public.playlist_tracks
  for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.owner_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.owner_id = auth.uid()
    )
    or public.is_admin()
  );

create policy playlist_follows_read_own_or_staff on public.playlist_follows
  for select using (user_id = auth.uid() or public.is_staff());

create policy playlist_follows_write_own on public.playlist_follows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Playback
-- ---------------------------------------------------------------------------

-- Sessions/events are written and read by trusted server code (service role).
-- No client policy is intentionally defined for playback_sessions or
-- playback_events; direct client access is denied.

create policy track_daily_stats_public_read on public.track_daily_stats
  for select using (true);

-- ---------------------------------------------------------------------------
-- Notifications and preferences
-- ---------------------------------------------------------------------------

create policy notifications_read_own on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

create policy notification_preferences_own on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Moderation and trust
-- ---------------------------------------------------------------------------

create policy reports_read_own_or_staff on public.reports
  for select using (reporter_id = auth.uid() or public.is_staff());

create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());

create policy reports_staff_update on public.reports
  for update using (public.is_staff()) with check (public.is_staff());

create policy verification_read_own_or_staff on public.verification_requests
  for select using (
    requester_id = auth.uid()
    or public.owns_artist(artist_id)
    or public.is_staff()
  );

create policy verification_request_owner_insert on public.verification_requests
  for insert with check (
    requester_id = auth.uid()
    and public.owns_artist(artist_id)
    and status = 'pending'
  );

create policy verification_admin_update on public.verification_requests
  for update using (public.is_admin())
  with check (public.is_admin() and reviewer_id = auth.uid());

create policy featured_public_read on public.featured_slots
  for select using (
    public.is_staff()
    or (
      start_at <= now()
      and (end_at is null or end_at > now())
    )
  );

create policy featured_admin_write on public.featured_slots
  for all using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_staff_read on public.audit_logs
  for select using (public.is_staff());

-- jobs and audit writes are reserved for the service role / trusted server.

-- ---------------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------------

create policy artwork_public_read on storage.objects
  for select using (bucket_id in ('artwork', 'avatars'));

create policy artwork_owner_write on storage.objects
  for insert with check (
    bucket_id in ('artwork', 'avatars')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy artwork_owner_update on storage.objects
  for update using (
    bucket_id in ('artwork', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy artwork_owner_delete on storage.objects
  for delete using (
    bucket_id in ('artwork', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- audio-masters and audio-renditions are private: signed URLs only, issued by
-- the playback endpoint after authorization. No storage.objects policy grants
-- direct access.