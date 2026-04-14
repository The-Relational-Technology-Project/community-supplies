
-- 1. Rate limit function for steward requests
CREATE OR REPLACE FUNCTION public.check_steward_request_rate_limit(request_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*) < 3
  FROM public.community_steward_requests
  WHERE email = request_email
    AND created_at > now() - interval '1 hour';
$$;

-- 2. Replace overly permissive INSERT policy on community_steward_requests
DROP POLICY IF EXISTS "Anyone can submit" ON public.community_steward_requests;
CREATE POLICY "Rate limited steward request submissions"
ON public.community_steward_requests
FOR INSERT
TO public
WITH CHECK (check_steward_request_rate_limit(email));

-- 3. Fix supply_requests INSERT policy to require vouching and validate owner
DROP POLICY IF EXISTS "Authenticated users can create supply requests" ON public.supply_requests;
CREATE POLICY "Vouched users can create valid supply requests"
ON public.supply_requests
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_user_vouched(auth.uid())
  AND supply_owner_id = (SELECT owner_id FROM public.supplies WHERE id = supply_id)
);

-- 4. Restrict community_neighbors SELECT to stewards only (federation_key is sensitive)
DROP POLICY IF EXISTS "Authenticated users can read neighbors" ON public.community_neighbors;
CREATE POLICY "Stewards can read neighbors"
ON public.community_neighbors
FOR SELECT
TO authenticated
USING (is_user_steward(auth.uid()));

-- 5. Fix storage delete policy to check ownership
DROP POLICY IF EXISTS "Authenticated users can delete their images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'supply-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
