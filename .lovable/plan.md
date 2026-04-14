

## Fix: Community Context Should Follow the User

### Problem
Routes without `/c/:slug` (like `/`, `/my-supplies`, `/profile`, `/steward`) always hardcode the community to "Sunset & Richmond SF." Any user from a different community who navigates to these routes sees the wrong community's data.

### Solution
When `CommunityProvider` has no slug, detect the authenticated user's community from their profile instead of defaulting to Sunset & Richmond.

### Changes

**`src/contexts/CommunityContext.tsx`**:
- When no `slug` is provided, check if the user is authenticated
- If authenticated, fetch their profile's `community_id` and look up the corresponding community
- Only fall back to the default community if the user is unauthenticated (landing page scenario)
- Listen for auth state changes so the community updates on sign-in/sign-out

**`src/App.tsx`**:
- Routes like `/my-supplies`, `/my-books`, `/profile` should redirect to `/c/:slug/...` equivalents, OR the CommunityProvider auto-detection handles it (the latter is simpler and what we'll do)

### Technical Detail

```text
Current flow:
  /my-supplies → CommunityProvider(no slug) → always Sunset & Richmond

Fixed flow:
  /my-supplies → CommunityProvider(no slug) → check auth → 
    authenticated? → fetch profile.community_id → resolve community
    not authenticated? → default to Sunset & Richmond (landing page)
```

### Edward's Immediate Fix
His data is already correct in the DB. Once the code fix deploys, it will work. No manual data fix needed.

### Systemic Impact
This affects every user who created a community via `/start-community` and then navigates to any non-`/c/` route. With the growing number of communities, this is critical to fix now.

### Files Changed
| File | Change |
|------|--------|
| `src/contexts/CommunityContext.tsx` | Add auth-aware community detection when no slug provided |

