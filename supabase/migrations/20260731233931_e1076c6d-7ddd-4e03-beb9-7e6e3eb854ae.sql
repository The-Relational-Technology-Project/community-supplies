DROP FUNCTION IF EXISTS public.fulfill_item_request(uuid, uuid);

CREATE OR REPLACE FUNCTION public.fulfill_item_request(p_request_id uuid, p_supply_id uuid)
RETURNS TABLE(request_title text, community_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_supply record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_req FROM public.item_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;

  SELECT * INTO v_supply FROM public.supplies WHERE id = p_supply_id;
  IF v_supply IS NULL THEN RAISE EXCEPTION 'supply not found'; END IF;
  IF v_supply.owner_id <> v_uid THEN RAISE EXCEPTION 'you can only fulfill with your own item'; END IF;
  IF v_supply.community_id IS DISTINCT FROM v_req.community_id THEN
    RAISE EXCEPTION 'item and request are in different communities';
  END IF;
  IF NOT public.user_in_community(v_uid, v_req.community_id) THEN
    RAISE EXCEPTION 'not a member of this community';
  END IF;
  IF v_req.status <> 'open' THEN RAISE EXCEPTION 'request is no longer open'; END IF;

  UPDATE public.item_requests
     SET status = 'fulfilled',
         fulfilled_supply_id = p_supply_id,
         fulfilled_by = v_uid,
         fulfilled_at = now()
   WHERE id = p_request_id;

  RETURN QUERY
  SELECT v_req.title, c.slug
    FROM public.communities c
   WHERE c.id = v_req.community_id;
END;
$$;