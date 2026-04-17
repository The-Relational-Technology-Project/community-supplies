

All six suggestions are sound. Let me prioritize by impact vs effort based on what I know about the codebase.

**Quick analysis of each:**

1. **Index on `community_id` + EXPLAIN the RPC** — Almost certainly the biggest win. `get_supplies_with_owners` filters `s.community_id = p_community_id` and joins profiles. Without an index, this is a seq scan every page load. High impact, trivial change.

2. **Preconnect to Supabase** — Free 100–300ms on first request. One line in `index.html`. No risk.

3. **Combine profile+community fetch in `CommunityContext`** — Currently two serial round trips (profile → community). One JOIN saves one full RTT (~100–200ms). Easy win.

4. **Parallel fetchSupplies** — Already mostly parallel via TanStack Query `enabled`. Marginal. Skip unless we find a real serialization.

5. **Supabase image transforms** — Big perceived-speed win on browse. The illustration grid loads many images; transforming to ~400px wide @ q70 can cut payload by 5–10x. Need to verify the `illustration_url` is a Supabase Storage URL (not external) before applying.

6. **Route-level `React.lazy()`** — Real bundle-size win for first paint. Steward dashboard especially is heavy (multiple manager components, batch tools). Easy refactor in `App.tsx`.

**Plan — ship all six, ordered by impact**

### 1. Database indexes (biggest win)
- Add migration:
  - `CREATE INDEX IF NOT EXISTS idx_supplies_community_id ON public.supplies(community_id);`
  - `CREATE INDEX IF NOT EXISTS idx_supplies_community_created ON public.supplies(community_id, created_at DESC);` (matches RPC's ORDER BY)
  - `CREATE INDEX IF NOT EXISTS idx_books_community_id ON public.books(community_id);`
  - `CREATE INDEX IF NOT EXISTS idx_profiles_community_id ON public.profiles(community_id);`
  - `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);` (used by `has_role`)
- Run EXPLAIN ANALYZE on `get_supplies_with_owners` before/after for confirmation.

### 2. Preconnect in `index.html`
- Add `<link rel="preconnect" href="https://mbmmfgivhqzhjyneyelu.supabase.co" crossorigin>` next to the existing Google Fonts preconnects.

### 3. Combine profile + community fetch
- In `CommunityContext.tsx`, replace the two serial queries with one:
  ```
  supabase.from('profiles').select('community_id, communities!inner(id, name, slug)').eq('id', user.id).maybeSingle()
  ```
- Saves one RTT on every authenticated root load.

### 4. Image transforms on illustrations
- Verify `illustration_url` is a Supabase Storage URL.
- Add a small helper `getOptimizedImageUrl(url, { width, quality })` that appends `?width=…&quality=…` for Storage URLs, passes through for others.
- Apply in `SupplyCard.tsx` (browse grid: ~400px) and the landing page illustration gallery (~300px). Keep full-res on detail/zoom views.

### 5. Route-level code splitting
- In `App.tsx`, convert `MySupplies`, `MyBooks`, `Profile`, `Steward`, `StartCommunity`, `PrivacyTerms`, and `CommunityStewardDashboard` to `React.lazy()` with a `<Suspense>` fallback (reuse the existing spinner).
- Keep `Index` eager (it's the landing route).

### 6. Skip #4 from the user's list
- `useSupplies` already gates on `isReady && user && communityId`. TanStack runs it as soon as those resolve. No change needed.

**Files modified**
- New migration: indexes
- `index.html` — preconnect
- `src/contexts/CommunityContext.tsx` — single joined query
- `src/lib/imageUrl.ts` (new) — transform helper
- `src/components/SupplyCard.tsx`, `src/components/LandingPage.tsx` — use helper
- `src/App.tsx` — lazy routes + Suspense

**Expected impact**
- DB indexes: 200ms–2s off supplies/books queries on larger communities
- Preconnect: 100–300ms off first Supabase request
- Joined profile+community: ~100–200ms off authenticated boot
- Image transforms: 50–80% smaller image payload on browse
- Code splitting: smaller initial JS bundle, faster first paint on `/`

After shipping I'll verify with `EXPLAIN ANALYZE` and ask you to hard-refresh and report perceived speed.

