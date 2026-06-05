# Why you're seeing this

You are **not** secretly a member of Sisters. Two things are happening:

1. **Data is safe.** Row-Level Security on `supplies` (and `books`) correctly blocks cross-community reads. That's why the grid says "No supplies found matching your criteria" instead of leaking Sisters' inventory. I verified your profile's `community_id` still points to `sunset-richmond`, not Sisters.
2. **The UI is wrong.** `src/pages/Index.tsx` only checks "is the user logged in?" — it never checks whether the logged-in user belongs to the community in the URL slug. So `/c/sisters` happily renders the Sisters library shell (header, category sidebar, Add Item, Bulk Add) to any authenticated user. The query returns nothing, so it looks empty.

Stewards and members do **not** have cross-community write access — RLS on `supplies`, `books`, `join_requests`, `user_roles`, etc. all scope by `community_id` / `user_id`. The bug is purely that the shell renders when it shouldn't.

# The fix

Add a membership gate in `src/pages/Index.tsx` for the slug-driven route:

- When `CommunityProvider` is slug-driven (i.e. URL is `/c/:slug`) and the resolved `communityId` does **not** match the logged-in user's `profile.community_id`, render the **public community landing** (the existing `LandingPage` with `CommunityHero` + join CTA) instead of the authenticated library shell.
- When it does match (member), render the library as today.
- Anonymous users continue to see `LandingPage` as today.
- The default `/` route (no slug) is unchanged — the user's own community resolves from their profile.

Site admins / stewards of one community should also be treated as non-members of other communities for this UI gate; this is a member view, not an admin override. A future "super admin sees all communities" mode can be added separately if you want it.

## Technical details

1. **`src/contexts/CommunityContext.tsx`** — expose whether the context was resolved from a URL slug (e.g. `isSlugRoute: boolean`) so `Index` can distinguish `/c/:slug` from `/`.
2. **`src/pages/Index.tsx`** — after auth + community both resolve, if `isSlugRoute && user` then fetch the user's `profile.community_id` once and compare to context `communityId`. If mismatched, render `<LandingPage onTabChange={setActiveTab} />` (which already shows `CommunityHero` for that slug with the join button). If matched, render the library as today.
3. No DB or RLS changes needed — RLS is already doing the right thing. This is purely a presentation fix so non-members see "Join this community" instead of an empty-looking library.

## Out of scope

- The empty library rendering for cross-community visits is a symptom, not a separate bug. No data migration needed.
- Steward-level "view any community" admin mode (can be added later if you want it).
