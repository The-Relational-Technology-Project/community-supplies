
The screenshot changes the diagnosis: this is not the unauthenticated landing page. It is the authenticated catalog shell, which means refresh is restoring enough auth state to render the app, but profile/community-dependent data is not finishing cleanly afterward.

What’s actually happening:
- `Index.tsx` renders the main library as soon as `useAuth()` reports a user.
- `UserProfile.tsx` separately fetches `profiles`, so the name can disappear even while the user is still technically signed in.
- `CommunityContext.tsx` runs its own auth/session resolution and also does awaited work inside `onAuthStateChange`, which is a known Supabase race/deadlock risk.
- Queries like `useSupplies()` depend on both auth and community context, but the app can render before those are fully settled.

Plan

1. Fix auth bootstrap at the source
- Refactor `src/hooks/useAuth.ts` so auth becomes “ready” only after the initial `supabase.auth.getSession()` restore completes.
- Keep `onAuthStateChange` for later sign-in/sign-out updates only.
- Avoid awaited work inside auth callbacks.

2. Remove the second auth race in community resolution
- Refactor `src/contexts/CommunityContext.tsx` so it no longer performs its own competing auth boot flow.
- Resolve the root-route community only after auth bootstrap is complete.
- Move any async profile/community lookups out of the raw `onAuthStateChange` callback.

3. Gate the UI on full app readiness, not partial auth
- Update `src/pages/Index.tsx` to wait for both auth readiness and community resolution before deciding between:
  - loading state
  - landing page
  - authenticated library
- This prevents the app from showing the library shell while the underlying context is still in flux.

4. Make the top-right nav resilient
- Update `src/components/auth/UserProfile.tsx` and `src/components/CatalogHeader.tsx` so the auth area never goes blank.
- While profile data is loading, show a lightweight placeholder/skeleton instead of disappearing entirely.
- If the session is truly absent, keep Sign In / magic link access visible.

5. Re-check authenticated query gating
- Confirm `src/hooks/useSupplies.ts`, `src/hooks/useBooks.ts`, and any role/profile fetches only run when:
  - auth bootstrap is complete
  - a user exists
  - community loading is complete
- This should eliminate the “flashing skeleton forever after refresh” state.

Files to update
- `src/hooks/useAuth.ts`
- `src/contexts/CommunityContext.tsx`
- `src/pages/Index.tsx`
- `src/components/auth/UserProfile.tsx`
- `src/components/CatalogHeader.tsx`
- likely small follow-ups in `src/hooks/useSupplies.ts` / `src/hooks/useBooks.ts`

Technical details
- The biggest bug is the duplicated auth/session resolution path plus awaited DB work inside `onAuthStateChange`.
- The current root route can render too early because auth, community, and profile readiness are tracked separately.
- The fix is to create one clear bootstrap order:

```text
restore session
-> resolve user
-> resolve community
-> enable user/profile/role/library queries
-> render final shell
```

Expected outcome
- Refreshing `/` no longer drops the visible user identity.
- Closing and reopening the tab preserves the signed-in experience.
- If a session is gone, the app clearly shows Sign In again.
- The item library stops getting stuck in the post-refresh skeleton state.
