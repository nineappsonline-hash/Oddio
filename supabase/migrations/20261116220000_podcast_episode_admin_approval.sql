-- Podcast episodes are moderated like music tracks.
-- Only verified uploads may enter the queue; only admins approve publication.
alter table public.podcast_episodes drop constraint if exists podcast_episodes_status_check;
alter table public.podcast_episodes add constraint podcast_episodes_status_check
 check (status in ('draft','pending_review','published','rejected','archived'));
alter table public.podcast_episodes add column if not exists reviewed_at timestamptz;
alter table public.podcast_episodes add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.podcast_episodes add column if not exists rejection_reason text;
create index if not exists idx_podcast_episodes_review_queue on public.podcast_episodes(created_at)
 where status='pending_review';
