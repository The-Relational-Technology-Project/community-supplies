

## Fix: Supply and Book Inserts Missing `community_id`

### Problem
When users from non-default communities (like Jack from Western Howard County) try to add items, the insert fails with a RLS violation. The `community_id` column defaults to the Sunset & Richmond UUID, but the RLS policy requires `community_id = get_user_community_id(auth.uid())`. Since Jack's community is different, the default value doesn't match, and the insert is rejected.

This affects **all non-default communities** for both supplies and books.

### Solution
Include `community_id` from the `CommunityContext` in every insert statement for supplies and books.

### Changes

| File | Change |
|------|--------|
| `src/components/AddSupply.tsx` | Import `useCommunity`, add `community_id: communityId` to the insert object |
| `src/components/BulkAddSupplies.tsx` | Import `useCommunity`, add `community_id: communityId` to the insert object |
| `src/hooks/useBooks.ts` | Import `useCommunity`, add `community_id: communityId` to the books insert objects |

Three files, no database changes needed. The RLS policies and column defaults are already correct -- we just need to pass the right value.

