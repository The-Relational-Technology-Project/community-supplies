-- Fix 1: Add UPDATE policy for supply-images bucket
CREATE POLICY "Users can update their own supply images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'supply-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Fix 2: Drop and recreate community_steward_requests policies with authenticated role
DROP POLICY IF EXISTS "Stewards can view" ON public.community_steward_requests;
DROP POLICY IF EXISTS "Stewards can update" ON public.community_steward_requests;

CREATE POLICY "Stewards can view steward requests"
ON public.community_steward_requests
FOR SELECT
TO authenticated
USING (is_user_steward(auth.uid()));

CREATE POLICY "Stewards can update steward requests"
ON public.community_steward_requests
FOR UPDATE
TO authenticated
USING (is_user_steward(auth.uid()));