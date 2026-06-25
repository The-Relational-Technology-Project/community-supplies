## Goal
Let founding stewards promote active members to co-stewards and demote them back. Works for existing communities AND every new community created going forward.

## Who is a "founding steward"?
Anyone with a `user_roles` steward row where a new `promoted_by` column is `NULL`. Co-stewards have `promoted_by = <the founder who promoted them>`.

- **Existing stewards**: the migration adds `promoted_by` as nullable with no backfill, so every current steward row stays `NULL` → all current stewards become founders. No behavior change for them.
- **New communities**: the `create-community` edge function inserts the initial steward row without setting `promoted_by`, so it defaults to `NULL` → that steward is automatically a founder. No code change needed in the edge function beyond what already exists.
- **Co-stewards added via the new UI**: the promote RPC sets `promoted_by = auth.uid()`, marking them as non-founders.

## Database migration
1. `ALTER TABLE public.user_roles ADD COLUMN promoted_by uuid REFERENCES auth.users(id);` (nullable; existing rows stay NULL = founders)
2. `is_founding_steward(_user_id, _community_id)` helper — true when a steward row exists for that user/community with `promoted_by IS NULL`.
3. SECURITY DEFINER RPCs:
   - `promote_member_to_steward(p_target_user_id uuid)` — verifies caller is a founding steward of their current community, target is an active member of the same community; inserts `user_roles` steward row with `promoted_by = auth.uid()` and updates `profiles.role` to `'steward'`.
   - `demote_steward_to_member(p_target_user_id uuid)` — verifies caller is founding steward; target must have `promoted_by IS NOT NULL` (founders can't be demoted via UI); deletes the steward `user_roles` row and sets `profiles.role` back to `'member'`.
4. Tighten the existing `"Stewards can manage community roles"` policy so only founding stewards can directly mutate steward rows (defense in depth; UI uses the RPCs).

## UI changes
File: `src/components/steward/CommunityOverview.tsx`
- Query whether the current user is a founding steward of the current community (one `user_roles` lookup).
- Fetch each steward's `promoted_by` alongside the member list so we can distinguish founders from co-stewards.
- In the members table, when the viewer is a founding steward:
  - **Active member row** → add a "Make steward" button next to Deactivate.
  - **Co-steward row** (`promoted_by IS NOT NULL`) → show a "Remove steward" button.
  - **Founding steward row** → Steward badge only, no action.
- Confirmation dialogs + toast + refetch on both actions.

## Edge function check
`supabase/functions/create-community/index.ts` already inserts the steward role without specifying `promoted_by`, so new community founders are automatically marked as founders by the default `NULL`. No change required there.

## Out of scope
- Transferring sole ownership / removing a founder.
- Email notification to the promoted user.
- Stewardship across multiple communities (the existing unique constraint on `(user_id, role)` still applies).

## Risk
Low. Additive column + two RPCs + one UI section. Behavior for current stewards and the create-community flow is unchanged.
