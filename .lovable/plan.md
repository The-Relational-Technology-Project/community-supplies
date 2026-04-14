

## Remove Vouching Remnants

Since all users are now auto-vouched on signup (`handle_new_user` sets `vouched_at = now()`), the vouching concept is dead code. Here's the cleanup plan:

### Summary

Replace all vouching gates with simple authentication checks. The `is_user_vouched` function and `vouched_at` column stay in the database for now (they always return true for any user), but all UI references and Edge Function checks get removed.

### Frontend Changes

1. **AuthGuard.tsx** -- Remove `requireVouched` prop and the "Waiting for Community Vouching" UI block. Only keep `requireSteward` logic. All `requireVouched` usages become plain `<AuthGuard>`.

2. **Index.tsx** -- Remove all `requireVouched` props from `<AuthGuard>` calls (4 instances).

3. **UserProfile.tsx** -- Remove `vouched_at` from the Profile interface, remove the `isVouched` variable, and remove the Heart icon + "Vouched" label from the dropdown.

4. **CommunityOverview.tsx** -- Remove `vouched_at` from the Member interface and any display of vouched status.

5. **JoinRequestsManager.tsx** -- Change the `status` type from `'pending' | 'rejected' | 'vouched'` to `'pending' | 'rejected' | 'approved'`. Update badge rendering accordingly. (The enum in DB still has 'vouched' but we can rename it in a migration.)

6. **VouchedUsersExport.tsx** -- Delete this file entirely (it's not imported anywhere).

7. **BulkCreateUsers.tsx** -- Update description text that references "vouched join requests".

### Edge Functions

8. **4 Edge Functions** (`generate-illustration`, `draft-item-from-image`, `scan-bookshelf`, `cross-community-search`) -- Remove the `is_user_vouched` RPC check. Keep the auth check (user must be signed in).

9. **bulk-create-users** -- Remove vouched status references; profiles are already created with `vouched_at = now()` by the trigger.

10. **create-community** -- Remove `vouched_at` from the profile upsert (the trigger handles it).

### Database Migration

11. **RLS policies** -- The policies using `is_user_vouched()` still work (always true), so they don't break anything. Optionally simplify them to just check `auth.uid() IS NOT NULL`, but this can be a follow-up to avoid a large migration.

### What We're NOT Changing (Yet)

- The `vouched_at` / `vouched_by` columns in `profiles` -- harmless, always populated by the trigger
- The `is_user_vouched()` DB function -- still called by RLS policies; always returns true
- The `join_request_status` enum -- renaming 'vouched' to 'approved' would require a full enum migration; can be a follow-up

### Files Affected

| File | Action |
|------|--------|
| `src/components/auth/AuthGuard.tsx` | Remove `requireVouched` prop + vouching UI |
| `src/pages/Index.tsx` | Remove `requireVouched` from 4 AuthGuard usages |
| `src/components/auth/UserProfile.tsx` | Remove vouched display |
| `src/components/steward/CommunityOverview.tsx` | Remove vouched_at from interface |
| `src/components/steward/VouchedUsersExport.tsx` | Delete |
| `src/components/steward/BulkCreateUsers.tsx` | Update text |
| `src/components/steward/JoinRequestsManager.tsx` | Update status labels |
| `supabase/functions/generate-illustration/index.ts` | Remove vouched check |
| `supabase/functions/draft-item-from-image/index.ts` | Remove vouched check |
| `supabase/functions/scan-bookshelf/index.ts` | Remove vouched check |
| `supabase/functions/cross-community-search/index.ts` | Remove vouched check |
| `supabase/functions/bulk-create-users/index.ts` | Remove vouched references |
| `supabase/functions/create-community/index.ts` | Remove vouched_at from upsert |

