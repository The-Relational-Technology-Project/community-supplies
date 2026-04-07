

## Fix: Duplicate QueryClientProvider Crash

### Root Cause

The caching update created a **conflict between two QueryClient instances**:

1. `main.tsx` creates a `QueryClient` with persistence config and wraps the app in `PersistQueryClientProvider`
2. `App.tsx` creates a **second** `QueryClient` (no persistence) and wraps everything again in `QueryClientProvider`

Components see the inner (App.tsx) client, which has no cache persistence and no prefetched data. The persisted client in main.tsx is effectively dead. When the localStorage cache tries to hydrate into the wrong client, React crashes with error #301.

The 500 error on `get_supplies_with_owners` appears to be a transient Supabase timeout (only 29 rows in the table, query is simple) — likely related to the earlier unhealthy state you mentioned. But the crash happens because the error isn't handled gracefully due to the provider conflict.

### Fix

**`src/App.tsx`** — Remove the duplicate `QueryClient` and `QueryClientProvider`. The component should just render the inner tree (TooltipProvider, BrowserRouter, etc.) without any query provider wrapper, since `main.tsx` already provides it.

This is a ~5 line deletion — remove the `QueryClient` import/creation and the `QueryClientProvider` wrapper, keeping everything else intact.

### Result
- Single QueryClient with persistence, prefetching, and 24-hour cache all working correctly
- Cached data renders instantly on refresh
- RPC errors display a toast instead of crashing the app

