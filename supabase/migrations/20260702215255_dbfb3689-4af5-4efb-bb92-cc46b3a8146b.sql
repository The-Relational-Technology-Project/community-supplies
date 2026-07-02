-- Fix: cross-community join request approvals silently failed because
-- the profiles RLS UPDATE policy for stewards evaluates against the row's
-- CURRENT community_id. When an applicant's profile lives in community A
-- but they request/are approved into community B, a steward of B is not a
-- steward of A, so the update matches 0 rows without an error.
--
-- Move approve/reject through SECURITY DEFINER RPCs that verify the caller
-- is a steward of the join_request's target community.

CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS TABLE(community_name text, community_slug text, member_name text, member_email text)
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
  IF v_req.community_id IS NULL THEN RAISE EXCEPTION 'join request has no community'; END IF;

  IF NOT public.is_steward_of(v_uid, v_req.community_id) THEN
    RAISE EXCEPTION 'only stewards of the target community can approve';
  END IF;

  UPDATE public.join_requests
     SET status = 'approved',
         reviewed_by = v_uid,
         reviewed_at = now()
   WHERE id = p_request_id;

  IF v_req.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET community_id = v_req.community_id,
           membership_status = 'active'
     WHERE id = v_req.user_id;
  END IF;

  RETURN QUERY
  SELECT c.name, c.slug, v_req.name, v_req.email
    FROM public.communities c
   WHERE c.id = v_req.community_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_join_request(p_request_id uuid)
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
  IF v_req.community_id IS NULL THEN RAISE EXCEPTION 'join request has no community'; END IF;

  IF NOT public.is_steward_of(v_uid, v_req.community_id) THEN
    RAISE EXCEPTION 'only stewards of the target community can reject';
  END IF;

  UPDATE public.join_requests
     SET status = 'rejected',
         reviewed_by = v_uid,
         reviewed_at = now()
   WHERE id = p_request_id;

  -- Only mark the profile rejected if it's currently pointing at this community.
  -- Otherwise the applicant lives in a different community and rejection here
  -- shouldn't disturb their membership there.
  IF v_req.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET membership_status = 'rejected'
     WHERE id = v_req.user_id
       AND community_id = v_req.community_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO authenticated;