

## Fix: Auth Race Conditions Causing Sign-In Loop / Half-Logged-In State

### Root cause analysis

The "signed in but with Sign In button + blank page + reload-loops-forever" symptom is caused by **multiple independent auth checks racing each other** across components. Five components each maintain their own auth state with their own `useEffect`:

| Component | Method | Problem |
|---|---|---|
| `Index.tsx` | `getSession()` + listener | Effect re-runs on `searchParams` changes (it calls `setSearchParams({})` itself → infinite re-subscribe risk) |
| `AuthGuard.tsx` | `getSession()` + listener | Independent state |
| `CatalogHeader.tsx` | `getUser()` + listener | Network call to `/auth/v1/user`, can be slow (25s symptom) |
| `UserProfile.tsx` | `getUser()` + listener | Another network call |
| `LandingPage.tsx` | `getUser()` + listener | Another network call |

The auth log confirms this: 4 separate `/user` requests fired at the same instant after sign-in. If any one of these stalls or returns `null` while others succeed, components disagree:

- `Index` thinks user is signed in → renders `CatalogHeader` + `BrowseSupplies` (wrapped in AuthGuard)
- `CatalogHeader` thinks user is null → shows "Sign In" button in nav
- `AuthGuard` (around BrowseSupplies) is still `loading=true` → shows blank "Loading..." that never resolves because its independent listener already fired

On refresh: `Index.tsx`'s effect depends on `[searchParams, setSearchParams]`. The effect calls `setSearchParams({})` inside itself, which re-triggers the effect. Each re-run creates a fresh auth subscription; if the timing is unlucky, `setLoading(false)` never fires for the new run → permanent loading spinner.

### The fix

**Create one shared auth hook and replace all 5 independent checks with it.**

#### New file: `src/hooks/useAuth.ts`

A single source of truth backed by `getSession()` (instant, reads from storage — no network call) and a single `onAuthStateChange` subscription. Returns `{ user, isReady }`. Per the Lovable stack-overflow guidance, this prevents components from querying before the session is restored.

```typescript
// Returns { user, isReady } — call once anywhere, get consistent state
const { user, isReady } = useAuth();
```

The hook stores state in a module-level store so all consumers share the same value (no duplicate subscriptions, no duplicate network calls).

#### Replace `getUser()` calls

`getUser()` is a network round-trip. `getSession()` reads from local storage and is synchronous-fast. Switch all components from `getUser()` to the shared `useAuth()` hook. This alone removes the 4 redundant `/user` requests and the 25-second slow load.

#### Files modified

1. **`src/hooks/useAuth.ts`** — new shared hook (module-singleton pattern)
2. **`src/pages/Index.tsx`** — use `useAuth()`; remove the `[searchParams, setSearchParams]` dependency that re-runs the auth effect; only consume the URL params once on mount
3. **`src/components/auth/AuthGuard.tsx`** — use `useAuth()`; keep the steward role query (gated by `isReady && user`)
4. **`src/components/CatalogHeader.tsx`** — use `useAuth()` instead of `getUser()`
5. **`src/components/auth/UserProfile.tsx`** — use `useAuth()` for the user; keep the profile/role fetch but gate on `isReady && user`
6. **`src/components/LandingPage.tsx`** — use `useAuth()` instead of `getUser()`

### Expected outcome

- Magic-link sign-in returns to the catalog view in under 2s instead of 25s (no more redundant `/user` calls).
- All header/nav/main components agree on auth state — no more "Sign In button visible while signed in".
- Refresh while signed in restores the session immediately from storage; no infinite loading loop.
- Sign-out and sign-in transitions propagate to every component through the single shared subscription.

### Why this won't break anything

- `getSession()` is the Supabase-recommended primary auth check for components (per project memory: `mem://auth/implementation-details`).
- Functional behavior is unchanged — only the wiring is consolidated.
- The steward-role check in AuthGuard and UserProfile remains intact, just gated behind `isReady`.

