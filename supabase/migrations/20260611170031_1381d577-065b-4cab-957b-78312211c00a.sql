
-- 1. Data repair: move Ellen's profile to Uplands
UPDATE public.profiles
   SET community_id = 'ed4143cd-d1bd-428f-a839-00a107e8bef4',
       vouched_at   = COALESCE(vouched_at, now())
 WHERE email = 'sharing@uplandsclaremont.com';

-- 2. Drop the dangerous Sunset default on profiles.community_id.
--    Any insert path must now provide community_id explicitly.
ALTER TABLE public.profiles ALTER COLUMN community_id DROP DEFAULT;

-- 3. New steward-scope predicate based on user_roles, not on profile drift.
CREATE OR REPLACE FUNCTION public.is_steward_of(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = 'steward'::app_role
       AND community_id = _community_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_steward_of(uuid, uuid) TO authenticated;

-- 4. Swap steward-scoped policies to use is_steward_of(auth.uid(), <table>.community_id).
--    Member-scoped policies (is_user_vouched + community_id = get_user_community_id)
--    are intentionally left alone — they apply to members, not stewards.

-- join_requests
DROP POLICY IF EXISTS "Stewards can view community join requests" ON public.join_requests;
CREATE POLICY "Stewards can view community join requests"
  ON public.join_requests
  FOR SELECT
  USING (public.is_steward_of(auth.uid(), community_id));

DROP POLICY IF EXISTS "Stewards can vouch community join requests" ON public.join_requests;
CREATE POLICY "Stewards can vouch community join requests"
  ON public.join_requests
  FOR UPDATE
  USING (public.is_steward_of(auth.uid(), community_id));

-- profiles
DROP POLICY IF EXISTS "Stewards can view community profiles" ON public.profiles;
CREATE POLICY "Stewards can view community profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_steward_of(auth.uid(), community_id));

DROP POLICY IF EXISTS "Stewards can update community member vouching" ON public.profiles;
CREATE POLICY "Stewards can update community member vouching"
  ON public.profiles
  FOR UPDATE
  USING (public.is_steward_of(auth.uid(), community_id));

-- supply_requests
DROP POLICY IF EXISTS "Stewards can view community supply requests" ON public.supply_requests;
CREATE POLICY "Stewards can view community supply requests"
  ON public.supply_requests
  FOR SELECT
  USING (public.is_steward_of(auth.uid(), community_id));

-- user_roles
DROP POLICY IF EXISTS "Stewards can view community roles" ON public.user_roles;
CREATE POLICY "Stewards can view community roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_steward_of(auth.uid(), community_id));

DROP POLICY IF EXISTS "Stewards can manage community roles" ON public.user_roles;
CREATE POLICY "Stewards can manage community roles"
  ON public.user_roles
  FOR ALL
  USING (public.is_steward_of(auth.uid(), community_id))
  WITH CHECK (public.is_steward_of(auth.uid(), community_id));
