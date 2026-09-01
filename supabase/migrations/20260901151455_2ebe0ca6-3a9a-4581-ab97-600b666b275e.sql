ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS request_notify_mode text NOT NULL DEFAULT 'off';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS request_emails_opt_out boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_request_notify_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.request_notify_mode NOT IN ('off', 'each', 'weekly') THEN
    RAISE EXCEPTION 'Invalid request_notify_mode: %', NEW.request_notify_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_request_notify_mode_trigger ON public.communities;
CREATE TRIGGER validate_request_notify_mode_trigger
  BEFORE INSERT OR UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_notify_mode();