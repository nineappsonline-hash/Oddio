CREATE TABLE IF NOT EXISTS public.track_lyrics_jobs (
  track_id uuid PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','failed','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_lyrics_jobs ENABLE ROW LEVEL SECURITY;
