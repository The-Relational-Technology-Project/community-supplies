

## Steward Member Management -- Clean Implementation

### Current state of "vouching" in the codebase

The `vouched_at` column on `profiles` and the `is_user_vouched()` DB function are the underlying access-control mechanism used by all RLS policies. These stay in the database -- they work, and renaming them would require touching every RLS policy. But no user-facing code should say "vouch."

**Remaining "vouch" references to clean up:**
- `JoinRequestsManager.tsx`: status type includes `'vouched'`, displays `vouched` mapped to "approved"
- `bulk-create-users` edge function: queries `status = 'vouched'`
- DB enum `join_request_status`: values are `pending | vouched | rejected` (no `approved` value)
- Edge function comments: "vouched status" in 3 files (cosmetic)

### Plan

#### 1. Database migration: add `join_mode` to communities + add `approved` to enum

```sql
-- Add join_mode column
ALTER TABLE communities ADD COLUMN join_mode text NOT NULL DEFAULT 'auto';

-- Add 'approved' value to the join_request_status enum
ALTER TYPE join_request_status ADD VALUE IF NOT EXISTS 'approved';
```

#### 2. Database migration: update `handle_new_user()` trigger

Modify the trigger to check the community's `join_mode`. If `approval_required`, set `vouched_at = null` instead of `now()`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger ...
AS $$
DECLARE
  v_community_id uuid;
  v_join_mode text;
BEGIN
  v_community_id := COALESCE(
    (NEW.raw_user_meta_data->>'community_id')::uuid,
    'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'::uuid
  );
  SELECT join_mode INTO v_join_mode FROM communities WHERE id = v_community_id;

  INSERT INTO profiles (id, name, email, vouched_at, intro_text, zip_code, community_id)
  VALUES (
    NEW.id, ...,
    CASE WHEN v_join_mode = 'approval_required' THEN null ELSE now() END,
    ..., v_community_id
  );
  RETURN NEW;
END;
$$;
```

#### 3. CommunityOverview.tsx -- add deactivate/reactivate

- Fetch `vouched_at` in the query (internal field name, never shown as "vouched")
- Show an "Active" / "Inactive" badge per member
- Add a "Deactivate" button (sets `vouched_at = null`) and "Reactivate" button (sets `vouched_at = now()`)
- Skip the button for steward rows (stewards can't deactivate other stewards)

#### 4. JoinRequestsManager.tsx -- make approval functional

- When steward clicks "Approve": update join_request status to `'approved'` (new enum value), then set the corresponding profile's `vouched_at = now()` using the request's `user_id`
- Remove all `'vouched'` string references from the component -- treat legacy `vouched` rows as `approved` in display
- Remove `voucher_id` from the interface (unused legacy field)

#### 5. Join mode toggle on steward dashboards

- Add a settings card (above or within the Members tab) in both `CommunityStewardDashboard.tsx` and `StewardDashboard.tsx`
- Switch component: "Require approval for new members"
- Reads/writes `communities.join_mode` for the steward's community
- Uses `useCommunity()` to get the `communityId`

#### 6. Update `bulk-create-users` edge function

- Change query filter from `status = 'vouched'` to `status = 'approved'` (or include both for backward compat with existing data)

### UI language guide

| Internal DB field | UI label |
|---|---|
| `vouched_at IS NOT NULL` | "Active" |
| `vouched_at IS NULL` | "Inactive" / "Pending approval" |
| `join_request.status = 'approved'` | "Approved" |
| `join_mode = 'auto'` | "Auto-join" |
| `join_mode = 'approval_required'` | "Require approval" |

No user-facing text will contain the word "vouch" anywhere.

### Files changed

- **Migration**: `communities.join_mode` column, `approved` enum value, updated `handle_new_user()` trigger
- `src/components/steward/CommunityOverview.tsx` -- deactivate/reactivate buttons + active status badge
- `src/components/steward/JoinRequestsManager.tsx` -- functional approve, clean "vouch" references
- `src/components/steward/CommunityStewardDashboard.tsx` -- join mode toggle
- `src/components/steward/StewardDashboard.tsx` -- join mode toggle
- `supabase/functions/bulk-create-users/index.ts` -- query both `approved` and `vouched` statuses

