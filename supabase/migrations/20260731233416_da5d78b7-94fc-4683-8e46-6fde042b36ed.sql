CREATE TABLE public.item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  note text,
  status text NOT NULL DEFAULT 'open',
  fulfilled_supply_id uuid REFERENCES public.supplies(id) ON DELETE SET NULL,
  fulfilled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_requests TO authenticated;
GRANT ALL ON public.item_requests TO service_role;

ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view community item requests"
ON public.item_requests FOR SELECT TO authenticated
USING (public.is_user_vouched(auth.uid()) AND community_id = public.get_user_community_id(auth.uid()));

CREATE POLICY "Members can create their own item requests"
ON public.item_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND public.is_user_vouched(auth.uid())
  AND community_id = public.get_user_community_id(auth.uid())
);

CREATE POLICY "Requesters can update their own item requests"
ON public.item_requests FOR UPDATE TO authenticated
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can delete their own item requests"
ON public.item_requests FOR DELETE TO authenticated
USING (auth.uid() = requester_id);

CREATE POLICY "Stewards can update community item requests"
ON public.item_requests FOR UPDATE TO authenticated
USING (public.is_steward_of(auth.uid(), community_id))
WITH CHECK (public.is_steward_of(auth.uid(), community_id));

CREATE POLICY "Stewards can delete community item requests"
ON public.item_requests FOR DELETE TO authenticated
USING (public.is_steward_of(auth.uid(), community_id));

CREATE INDEX idx_item_requests_community_status ON public.item_requests (community_id, status, created_at DESC);

CREATE TRIGGER update_item_requests_updated_at
BEFORE UPDATE ON public.item_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fulfill_item_request(p_request_id uuid, p_supply_id uuid)
RETURNS TABLE(requester_email text, requester_name text, request_title text, community_slug text)
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
  SELECT p.email, p.name, v_req.title, c.slug
    FROM public.profiles p
    JOIN public.communities c ON c.id = v_req.community_id
   WHERE p.id = v_req.requester_id;
END;
$$;