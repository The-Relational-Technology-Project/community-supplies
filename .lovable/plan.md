
## Root cause

The bug Ellen and Paul hit is a routing problem, not a header/tenant bug.

- `/c/:communitySlug` routes wrap `<Index />` in `<CommunityProvider slug={communitySlug}>`, which resolves the community from the URL.
- But `/my-supplies`, `/my-books`, `/profile`, and `/steward` are registered as **top-level routes** with no slug:
  ```
  <Route path="/my-supplies" element={<CommunityProvider><MySupplies /></CommunityProvider>} />
  ```
  With no `slug` prop, `CommunityProvider` falls back to its hard-coded default (`sunset-richmond` / Sunset & Richmond SF) until it finishes an auth-based lookup. For Ellen this means the header instantly flips to "Sunset & Richmond SF" the moment she lands on `/my-supplies`.

- `UserProfile.tsx` navigates to the bare path:
  ```ts
  navigate('/my-supplies')
  ```
  so the slug context is lost as soon as she clicks "My Supplies" from UCAN.

- Once she's on `/my-supplies` showing the Sunset header and clicks **Sign In**, the auth modal posts a join request to whatever community context is active — Sunset. That's why every retry generated another Sunset join request.

The "main share page works as expected" because that page is `/c/uplands-claremont-area-neighbors`, which carries the slug.

## Fix

Make every authenticated sub-page slug-scoped and route all in-app links through the active slug.

### 1. Add slug-scoped routes in `src/App.tsx`

Add parallel `/c/:communitySlug/...` routes for each protected page, wrapped in `CommunityProvider` with the slug, mirroring the existing steward pattern:

```
/c/:communitySlug/my-supplies
/c/:communitySlug/my-books
/c/:communitySlug/profile
```

`/c/:communitySlug/steward` already exists — keep it.

Keep the old bare paths (`/my-supplies`, etc.) as **back-compat redirects** that read the user's profile community and `navigate('/c/<slug>/my-supplies', { replace: true })`. If the user isn't signed in, redirect to `/`. This protects bookmarks and old email links.

### 2. Update internal navigation to include the slug

In `src/components/auth/UserProfile.tsx`, replace:
- `navigate('/profile')` → `navigate(\`/c/${communitySlug}/profile\`)`
- `navigate('/my-supplies')` → `navigate(\`/c/${communitySlug}/my-supplies\`)`

In `src/components/Header.tsx`, replace `navigate('/steward')` → `navigate(\`/c/${communitySlug}/steward\`)`.

Audit the four affected pages (`MySupplies`, `MyBooks`, `Profile`, `Steward`) plus any "back" / tab-change buttons and ensure they push slug-prefixed URLs (most already use `\`/c/${communitySlug}\`` for back navigation — just verify).

### 3. Tighten `CommunityProvider` default behavior (small safety net)

When no slug is provided AND the user is signed in, don't show the default Sunset name during the loading window — render with `loading: true` so the header shows the loading state instead of flashing "Sunset & Richmond SF" for users in other communities. (Optional polish; the routing fix above is the real fix.)

## Out of scope

- No DB / RLS / edge-function changes.
- No changes to join-request logic itself — once the header reflects the right community, the existing join flow already targets the correct community via context.
- Not touching the Stack Overflow `X-Tenant-Id` suggestion — this project doesn't use tenant headers; community is resolved from the URL slug.

## Verification

1. Sign in as a UCAN member, land on `/c/uplands-claremont-area-neighbors`, open the user menu → "My Supplies". Header should stay "Uplands Claremont Area Neighbors" and URL should be `/c/uplands-claremont-area-neighbors/my-supplies`.
2. Visit bare `/my-supplies` while signed in as UCAN — should redirect to `/c/uplands-claremont-area-neighbors/my-supplies`.
3. Sign out from a UCAN sub-page, click Sign In — auth modal should be in UCAN context, not Sunset.
4. Repeat the same flow for `/my-books`, `/profile`, `/steward`.
