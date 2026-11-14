-- Private negative reactions; not included in public like counts.
CREATE TABLE IF NOT EXISTS public.track_dislikes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
ALTER TABLE public.track_dislikes ENABLE ROW LEVEL SECURITY;
