CREATE OR REPLACE FUNCTION public.log_artist_application_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved', 'rejected', 'needs_information') THEN
    RETURN NEW;
  END IF;
  IF NEW.reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Reviewer required for application decision';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  VALUES (
    NEW.reviewer_id,
    'artist_application.' || NEW.status::text,
    'artist_application',
    NEW.id,
    jsonb_build_object('status', OLD.status),
    jsonb_build_object('status', NEW.status, 'reviewer_id', NEW.reviewer_id)
  );
  INSERT INTO public.notifications (user_id, type, actor_id, title, body, payload)
  VALUES (
    NEW.applicant_id,
    'artist_application_decision',
    NEW.reviewer_id,
    'Artist application ' || replace(NEW.status::text, '_', ' '),
    CASE WHEN btrim(NEW.review_notes) <> '' THEN NEW.review_notes
         ELSE 'Your artist application has been reviewed.' END,
    jsonb_build_object('application_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_artist_application_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS artist_application_review_logged ON public.artist_applications;
CREATE TRIGGER artist_application_review_logged
AFTER UPDATE OF status ON public.artist_applications
FOR EACH ROW
EXECUTE FUNCTION public.log_artist_application_review();
