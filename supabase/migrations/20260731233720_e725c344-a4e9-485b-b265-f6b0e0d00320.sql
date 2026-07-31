CREATE OR REPLACE FUNCTION public.get_item_requests(p_community_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  category text,
  note text,
  status text,
  created_at timestamp with time zone,
  requester_id uuid,
  requester_name text,
  fulfilled_supply_id uuid,
  fulfilled_supply_name text,
  fulfilled_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = v_uid
       AND p.community_id = p_community_id
       AND p.vouched_at IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.id, r.title, r.category, r.note, r.status, r.created_at,
         r.requester_id,
         split_part(coalesce(rp.name, 'A neighbor'), ' ', 1) AS requester_name,
         r.fulfilled_supply_id,
         s.name AS fulfilled_supply_name,
         r.fulfilled_at
    FROM public.item_requests r
    LEFT JOIN public.profiles rp ON rp.id = r.requester_id
    LEFT JOIN public.supplies s ON s.id = r.fulfilled_supply_id
   WHERE r.community_id = p_community_id
   ORDER BY (r.status = 'open') DESC, r.created_at DESC;
END;
$$;