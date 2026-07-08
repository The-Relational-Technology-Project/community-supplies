
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS custom_join_question TEXT;
ALTER TABLE public.join_requests ADD COLUMN IF NOT EXISTS custom_answer TEXT;

-- Prevent duplicate pending join requests for the same email+community.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_join_requests_pending_email_community
  ON public.join_requests (email, community_id)
  WHERE status = 'pending';

-- Steward-only dismiss: deletes a join_request row without touching the applicant's profile.
CREATE OR REPLACE FUNCTION public.dismiss_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_req FROM public.join_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'join request not found'; END IF;
  IF NOT public.is_steward_of(v_uid, v_req.community_id) THEN
    RAISE EXCEPTION 'only stewards of the target community can dismiss';
  END IF;
  DELETE FROM public.join_requests WHERE id = p_request_id;
END;
$$;

-- One-time cleanup: keep the most-recent approved row for isopod.wispy in CCNC, drop the two older duplicates.
DELETE FROM public.join_requests
 WHERE id IN (
   SELECT jr.id
     FROM public.join_requests jr
     JOIN public.communities c ON c.id = jr.community_id
    WHERE jr.email = 'isopod.wispy_9b@icloud.com'
      AND c.slug = 'columbia-city-neighbors-club'
      AND jr.id NOT IN (
        SELECT id FROM public.join_requests
         WHERE email = 'isopod.wispy_9b@icloud.com'
           AND community_id = jr.community_id
         ORDER BY requested_at DESC
         LIMIT 1
      )
 );

-- Set CCNC's custom join question to the one Caitlin has been asking manually.
UPDATE public.communities
   SET custom_join_question = 'What is a Columbia City Neighbors Club event you have attended?'
 WHERE slug = 'columbia-city-neighbors-club'
   AND custom_join_question IS NULL;
