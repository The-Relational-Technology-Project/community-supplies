-- Discovered while implementing fix #4 (NOT in the original list, but fixes #2
-- and #4 are toothless without it — flag for review).
--
-- The "Users can update own profile (excluding role)" policy (from
-- 20251120224949) only pins `role` in its WITH CHECK. It does NOT pin
-- vouched_at or membership_status, so any authenticated user could run
--   UPDATE profiles SET vouched_at = now() WHERE id = auth.uid()
-- on their own row and self-approve — bypassing the approval gate entirely.
--
-- The sync trigger from the previous migration already neutralizes a direct
-- vouched_at write (it re-derives vouched_at from membership_status), so the
-- remaining vector is setting membership_status directly. Pin both columns to
-- their current values for self-updates, exactly as `role` is pinned. Steward
-- approve/deactivate flows use the separate steward policy and are unaffected;
-- switch_user_community is SECURITY DEFINER and bypasses RLS. Profile self-edits
-- (name, zip_code, intro_text) are unaffected.

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
