
DROP POLICY IF EXISTS "Users can update own profile (excluding role)" ON public.profiles;

CREATE POLICY "Users can update own profile (excluding role)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND membership_status = (SELECT membership_status FROM public.profiles WHERE id = auth.uid())
  AND vouched_at IS NOT DISTINCT FROM (SELECT vouched_at FROM public.profiles WHERE id = auth.uid())
);
