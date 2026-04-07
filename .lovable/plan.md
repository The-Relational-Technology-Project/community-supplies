

## Speed Up Item Library Loading

### Problem
Every time the browse page mounts (or after 10 minutes of inactivity), a fresh RPC call to `get_supplies_with_owners` fires and the user stares at a spinner. Since you said it's always the same browser, we can cache aggressively.

### Approach: Three complementary improvements

**1. Persist React Query cache to localStorage**
The biggest win. On repeat visits, supplies appear instantly from the local cache while a background refresh happens silently. Uses `@tanstack/react-query-persist-client` with a localStorage persister.

- Install `@tanstack/react-query-persist-client`
- In `main.tsx`, wrap the app with `PersistQueryClientProvider` and configure a `createSyncStoragePersister` backed by `localStorage`
- Set `gcTime` to 24 hours (cache survives longer between visits)
- Data shows immediately; stale data refreshes in the background

**2. Prefetch supplies on auth**
In `Index.tsx`, as soon as the user is authenticated, prefetch the supplies query so data is ready before they even click "Browse." One line: `queryClient.prefetchQuery(...)`.

**3. Add skeleton loading instead of spinner**
Replace the full-screen spinner in `BrowseSupplies` with a grid of skeleton cards matching the layout. This gives a sense of structure while loading and feels significantly faster perceptually.

### Files to modify
- `package.json` — add `@tanstack/react-query-persist-client`
- `src/main.tsx` — swap to `PersistQueryClientProvider` with localStorage persister
- `src/pages/Index.tsx` — prefetch supplies on auth
- `src/components/BrowseSupplies.tsx` — skeleton grid instead of spinner
- `src/hooks/useSupplies.ts` — export the query key constant for reuse

### Result
First visit: skeleton cards appear instantly, data loads in 1-2s. Every subsequent visit (same browser): data renders immediately from cache, background refresh happens silently.

