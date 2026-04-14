

## Multi-Community End-to-End Audit: Remaining Issues

I found **5 issues** that will break the experience for new stewards and their community members.

### Issue 1: Navigation links lose community context
**Severity: High** -- affects every non-default community user

Pages like `/my-supplies`, `/my-books`, `/profile` navigate back to `/` (the generic landing/default route) instead of `/c/{slug}`. When a user from "Western Howard County" clicks "Back" from My Supplies, they land on the Sunset & Richmond context.

**Affected files and links:**
- `MySupplies.tsx`: `navigate('/')`, `navigate('/?tab=...')`
- `MyBooks.tsx`: `navigate('/?tab=browse')`, `navigate('/?tab=...')`
- `Profile.tsx`: `navigate('/')`, `navigate('/?tab=...')`
- `AddSupply.tsx`: `navigate('/?tab=browse')`
- `BulkAddSupplies.tsx`: `navigate('/?tab=browse')`
- `BookLibrary.tsx`: `navigate('/my-books')`
- `UserProfile.tsx`: `navigate('/profile')`, `navigate('/my-supplies')`

**Fix:** Use `communitySlug` from `useCommunity()` to build community-aware URLs: `navigate(`/c/${communitySlug}?tab=browse`)` etc. For `/my-supplies` and `/profile`, either add `/c/:slug/my-supplies` routes or keep the generic routes (they now resolve community from auth), but "Back" buttons must go to `/c/{slug}`.

### Issue 2: Steward dashboard shows ALL communities' data
**Severity: High** -- stewards see other communities' members, requests, supplies

Several steward components query without filtering by `community_id`:
- **`CommunityOverview.tsx`**: `supabase.from('profiles').select(...)` with no community filter -- shows members from ALL communities
- **`JoinRequestsManager.tsx`**: `supabase.from('join_requests').select(...)` with no community filter (RLS does filter by community, but worth confirming)
- **`SupplyRequestsManager.tsx`**: `supabase.from('supply_requests').select(...)` with no community filter (RLS does filter)
- **`BulkEmailSender.tsx`**: calls `send-bulk-update` edge function which may email ALL users, not just the steward's community

RLS on `profiles` allows stewards to see profiles in their own community, so `CommunityOverview` might already be scoped. But the `JoinRequestsManager` and `SupplyRequestsManager` RLS policies also scope to `community_id = get_user_community_id(auth.uid())`, so these are likely safe at the DB level. **However**, `BulkEmailSender` is the most dangerous -- it likely emails all users across all communities.

### Issue 3: `UserProfile.tsx` checks steward role from `profiles.role` column, not `user_roles` table
**Severity: Medium**

Line 62: `const isSteward = profile.role === 'steward'` reads from the `profiles` table's `role` column. The authoritative source is `user_roles`. If these get out of sync, the steward dashboard link won't appear in the user menu. The `AuthGuard` correctly checks `user_roles`, but `UserProfile` does not.

### Issue 4: `supply_requests` inserts are missing `community_id`
**Severity: Medium** -- borrowing requests from non-default communities will fail or go to wrong community

The `ContactModal.tsx` calls `send-contact-message` edge function but doesn't pass `community_id`. The `supply_requests` table has a default of the Sunset community UUID. Same RLS pattern as the supply insert bug we just fixed.

### Issue 5: `BulkEmailSender` sends to all communities
**Severity: High** -- steward bulk email would reach users in other neighborhoods

The `send-bulk-update` edge function likely queries all profiles without community filtering. A steward from one community could email everyone on the platform.

---

### Plan

| # | File(s) | Change |
|---|---------|--------|
| 1 | `MySupplies.tsx`, `MyBooks.tsx`, `Profile.tsx`, `AddSupply.tsx`, `BulkAddSupplies.tsx`, `BookLibrary.tsx` | Use `useCommunity().communitySlug` to build back-navigation URLs like `/c/${slug}?tab=browse` |
| 2 | `UserProfile.tsx` | Change steward check from `profiles.role` to querying `user_roles` table (matching `AuthGuard` pattern) |
| 3 | `BulkEmailSender.tsx` + `send-bulk-update` edge function | Pass `communityId` and filter recipients to the steward's community only |
| 4 | `ContactModal.tsx` + `send-contact-message` edge function | Pass `community_id` so `supply_requests` inserts have the correct community |
| 5 | Verify `CommunityOverview`, `JoinRequestsManager`, `SupplyRequestsManager` | Confirm RLS scoping is sufficient; add explicit community_id filters if needed for clarity |

### Files Changed (estimated)
- `src/pages/MySupplies.tsx`
- `src/pages/MyBooks.tsx`
- `src/pages/Profile.tsx`
- `src/components/AddSupply.tsx`
- `src/components/BulkAddSupplies.tsx`
- `src/components/books/BookLibrary.tsx`
- `src/components/auth/UserProfile.tsx`
- `src/components/ContactModal.tsx`
- `src/components/steward/BulkEmailSender.tsx`
- `supabase/functions/send-bulk-update/index.ts` (add community_id filter)
- `supabase/functions/send-contact-message/index.ts` (pass community_id to supply_requests)

No database migrations needed -- RLS policies are already correct.

