-- Fix 1: Prevent privilege escalation on profiles INSERT
-- Drop the existing permissive INSERT policy and replace with one that enforces role='member'
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'member'::user_role
  );

-- Fix 2: Scope community_steward_requests SELECT/UPDATE to steward's own community
-- First, drop the overly broad policies
DROP POLICY IF EXISTS "Stewards can view steward requests" ON public.community_steward_requests;
DROP POLICY IF EXISTS "Stewards can update steward requests" ON public.community_steward_requests;

-- Create a helper function to get the steward's community slug
CREATE OR REPLACE FUNCTION public.get_user_community_slug(p_user_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT c.slug
  FROM public.profiles p
  JOIN public.communities c ON c.id = p.community_id
  WHERE p.id = p_user_id
  LIMIT 1;
$$;

-- Scoped SELECT: stewards can only view requests for their community
CREATE POLICY "Stewards can view own community steward requests"
  ON public.community_steward_requests
  FOR SELECT
  TO authenticated
  USING (
    is_user_steward(auth.uid())
    AND community_slug = get_user_community_slug(auth.uid())
  );

-- Scoped UPDATE: stewards can only update requests for their community
CREATE POLICY "Stewards can update own community steward requests"
  ON public.community_steward_requests
  FOR UPDATE
  TO authenticated
  USING (
    is_user_steward(auth.uid())
    AND community_slug = get_user_community_slug(auth.uid())
  );