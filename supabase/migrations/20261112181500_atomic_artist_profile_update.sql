-- Atomically replace artist profile fields and social links under caller RLS.
CREATE OR REPLACE FUNCTION public.update_artist_profile_atomic(
  p_artist_id uuid,
  p_name text,
  p_slug text,
  p_bio text,
  p_accent text,
  p_social_links jsonb
)
RETURNS public.artists
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_artist public.artists%ROWTYPE;
  v_link jsonb;
  v_index integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_social_links IS NULL OR jsonb_typeof(p_social_links) <> 'array' THEN
    RAISE EXCEPTION 'socialLinks must be an array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_social_links) > 20 THEN
    RAISE EXCEPTION 'Too many social links' USING ERRCODE = '22023';
  END IF;
  UPDATE public.artists
  SET name = btrim(p_name), slug = p_slug, bio = btrim(p_bio), accent = p_accent
  WHERE id = p_artist_id AND owner_user_id = auth.uid()
  RETURNING * INTO v_artist;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artist not found or not owned' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.artist_social_links WHERE artist_id = p_artist_id;
  FOR v_link IN SELECT value FROM jsonb_array_elements(p_social_links) LOOP
    IF jsonb_typeof(v_link) <> 'object'
       OR length(coalesce(v_link->>'platform','')) NOT BETWEEN 1 AND 50
       OR length(coalesce(v_link->>'url','')) NOT BETWEEN 1 AND 2048 THEN
      RAISE EXCEPTION 'Invalid social link' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.artist_social_links(artist_id, platform, url, sort_order)
    VALUES(p_artist_id, v_link->>'platform', v_link->>'url', v_index);
    v_index := v_index + 1;
  END LOOP;
  RETURN v_artist;
END;
$$;
REVOKE ALL ON FUNCTION public.update_artist_profile_atomic(uuid,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_artist_profile_atomic(uuid,text,text,text,text,jsonb) TO authenticated;
