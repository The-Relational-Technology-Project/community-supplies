

## Two-part response

### Part A — Quick answer on the email batch UI

Yes — the batch send UI I proposed lives inside `StewardDashboard.tsx`, which is already gated by `AuthGuard requireSteward`. To make absolutely sure it's only visible to **you**, not to other community stewards, I'll add a second gate: only render the panel if the current user's `community_slug === 'sunset-richmond'` (the flagship). Other stewards get nothing. (We can also pin it to your specific user id if you prefer — let me know.)

### Part B — Why your SF page isn't loading items

This is the priority. Here's what I found.

**Findings**

1. Your profile is fine: vouched, `community_id = a0a0a0a0…` (flagship), and there are 40 supplies in the DB for that community. Server side is healthy.
2. `Index.tsx` only blocks on `!isReady` from `useAuth()`, so the page paints. Then `BrowseSupplies → useSupplies()` fires its query.
3. **The most likely culprit is the persisted query cache.** `main.tsx` configures TanStack Query with `staleTime: 5 min`, `gcTime: 24 h`, and a `localStorage` persister keyed `community-supplies-cache` with `buster: 'v4'`. If an older session cached an empty `[]` for `['supplies', communityId]` (very possible during the recent auth-race period when `is_user_vouched` could return false before the JWT was attached), that `[]` is now being **served from cache for up to 5 minutes** with no refetch, on every page load, with no spinner because `loading` is false.
4. A secondary contributor: `useSupplies` has no `enabled: isReady && !!user` gate. So it can fire before the access token is restored and cache an unauthenticated empty result.
5. Edge logs and auth logs are empty in the analytics window, consistent with "request returned 200 with []" rather than an error.

**Why refresh doesn't help you**: persisted cache is restored from `localStorage` on every load → instantly hydrates with `[]` → `staleTime` keeps it "fresh" → no refetch → blank grid.

**Fix (small, surgical)**

1. **`src/hooks/useSupplies.ts`** — add `enabled: isReady && !!user` to the `useQuery` so it never runs unauthenticated. Also use `useAuth()` here so the query key includes the user id (auto-invalidates on user change).
2. **`src/main.tsx`** — bump `buster` from `'v4'` to `'v5'` to invalidate any poisoned persisted cache for everyone (one-time wipe).
3. **`src/main.tsx`** — add a `dehydrateOptions: { shouldDehydrateQuery: q => q.state.status === 'success' && Array.isArray(q.state.data) ? q.state.data.length > 0 : true }` so empty arrays are never persisted again. This prevents the same trap going forward without changing the perceived speed for healthy responses.
4. Apply the same `enabled` + `useAuth` gating to `useBooks` (same shape, same risk).

**What this changes for you**
- On next deploy, your localStorage cache is invalidated by the buster bump → first load fetches fresh data → grid populates.
- Going forward, no unauthenticated query can fire and no empty result can be cached.
- No DB or RLS changes required.

**Files modified**
- `src/hooks/useSupplies.ts`
- `src/hooks/useBooks.ts`
- `src/main.tsx`

I'll do this fix first; once confirmed working, I'll proceed with the welcome email batch with the flagship-steward-only gate baked in.

