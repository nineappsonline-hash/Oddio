-- Store the position in a track where a listener posted a comment.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS timestamp_seconds integer;
ALTER TABLE public.comments ADD CONSTRAINT comments_timestamp_seconds_range CHECK (timestamp_seconds IS NULL OR timestamp_seconds BETWEEN 0 AND 86400);
CREATE INDEX IF NOT EXISTS comments_track_timeline_idx ON public.comments (track_id, timestamp_seconds) WHERE status = 'visible';
