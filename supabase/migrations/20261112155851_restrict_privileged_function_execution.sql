-- Applied to production project weflfkftkdlrolctdmae on 2026-11-12.
-- Restrict privileged functions to trusted backend roles.
-- RLS helper functions (is_staff, owns_track, etc.) deliberately remain callable.
-- PostgreSQL trigger invocations do not depend on direct EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.append_playlist_track(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_emails(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_email(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_job(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_job(text,text,uuid,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_playback_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_email(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_job(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_scheduled_albums() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_scheduled_tracks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_unique_listeners(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_artist_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_comment_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_track_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_followers_on_release() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_notification_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_qualified_play() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_playlist_follower_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_track_comment_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_track_like_count() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.tracks_search_vector() SET search_path = public, pg_temp;
