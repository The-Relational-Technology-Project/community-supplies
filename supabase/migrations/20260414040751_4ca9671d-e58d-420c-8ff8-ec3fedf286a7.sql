
-- Fix join_requests SELECT policies to require authentication
DROP POLICY IF EXISTS "Users can view their own join request" ON public.join_requests;
CREATE POLICY "Users can view their own join request"
ON public.join_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Stewards can view community join requests" ON public.join_requests;
CREATE POLICY "Stewards can view community join requests"
ON public.join_requests
FOR SELECT
TO authenticated
USING (is_user_steward(auth.uid()) AND community_id = get_user_community_id(auth.uid()));
