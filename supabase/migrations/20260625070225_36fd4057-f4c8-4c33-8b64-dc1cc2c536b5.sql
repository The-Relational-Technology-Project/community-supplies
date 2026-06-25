
-- 1. Add promoted_by column (NULL = founding steward)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS promoted_by uuid REFERENCES auth.users(id);

-- 2. Founding steward helper
CREATE OR REPLACE FUNCTION public.is_founding_steward(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND role = 'steward'::app_role
      AND promoted_by IS NULL
  );
$$;

-- 3a. Promote RPC
CREATE OR REPLACE FUNCTION public.promote_member_to_steward(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_community_id uuid;
  v_target_community uuid;
  v_target_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT community_id INTO v_community_id FROM public.profiles WHERE id = v_uid;
  IF v_community_id IS NULL THEN RAISE EXCEPTION 'caller has no community'; END IF;

  IF NOT public.is_founding_steward(v_uid, v_community_id) THEN
    RAISE EXCEPTION 'only founding stewards can promote members';
  END IF;

  SELECT community_id, membership_status::text
    INTO v_target_community, v_target_status
    FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_community IS DISTINCT FROM v_community_id THEN
    RAISE EXCEPTION 'target is not in your community';
  END IF;
  IF v_target_status <> 'active' THEN
    RAISE EXCEPTION 'target must be an active member';
  END IF;

  INSERT INTO public.user_roles (user_id, role, community_id, promoted_by)
  VALUES (p_target_user_id, 'steward'::app_role, v_community_id, v_uid)
  ON CONFLICT (user_id, role) DO UPDATE
    SET community_id = EXCLUDED.community_id,
        promoted_by = EXCLUDED.promoted_by;

  UPDATE public.profiles SET role = 'steward' WHERE id = p_target_user_id;
END;
$$;

-- 3b. Demote RPC
CREATE OR REPLACE FUNCTION public.demote_steward_to_member(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_community_id uuid;
  v_target_promoted_by uuid;
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT community_id INTO v_community_id FROM public.profiles WHERE id = v_uid;
  IF v_community_id IS NULL THEN RAISE EXCEPTION 'caller has no community'; END IF;

  IF NOT public.is_founding_steward(v_uid, v_community_id) THEN
    RAISE EXCEPTION 'only founding stewards can demote co-stewards';
  END IF;

  SELECT promoted_by, true INTO v_target_promoted_by, v_exists
    FROM public.user_roles
    WHERE user_id = p_target_user_id
      AND community_id = v_community_id
      AND role = 'steward'::app_role;

  IF NOT COALESCE(v_exists, false) THEN
    RAISE EXCEPTION 'target is not a steward of your community';
  END IF;
  IF v_target_promoted_by IS NULL THEN
    RAISE EXCEPTION 'founding stewards cannot be demoted here';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = p_target_user_id
     AND community_id = v_community_id
     AND role = 'steward'::app_role;

  UPDATE public.profiles SET role = 'member' WHERE id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_member_to_steward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_steward_to_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founding_steward(uuid, uuid) TO authenticated;

-- 4. Tighten steward-row mutation policy: only founding stewards can directly insert/update/delete steward rows
DROP POLICY IF EXISTS "Stewards can manage community roles" ON public.user_roles;

CREATE POLICY "Founding stewards manage steward rows"
ON public.user_roles
FOR ALL
USING (
  role = 'steward'::app_role
    AND public.is_founding_steward(auth.uid(), community_id)
)
WITH CHECK (
  role = 'steward'::app_role
    AND public.is_founding_steward(auth.uid(), community_id)
);

CREATE POLICY "Stewards manage non-steward roles"
ON public.user_roles
FOR ALL
USING (
  role <> 'steward'::app_role
    AND public.is_steward_of(auth.uid(), community_id)
)
WITH CHECK (
  role <> 'steward'::app_role
    AND public.is_steward_of(auth.uid(), community_id)
);
