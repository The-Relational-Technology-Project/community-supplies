

## Multi-Community Architecture — Implementation Plan

### What We're Building

Transform the single-community app into a multi-tenant platform where each community lives at `communitysupplies.org/{slug}` (e.g., `/oakland`, `/mission`). The existing Sunset & Richmond community keeps working at the root `/` path. New communities get their own isolated data, stewards, and members.

### Database Changes (Migration 1)

**New `communities` table:**
```sql
communities (
  id uuid PK,
  name text NOT NULL,           -- "Oakland Hills"
  slug text UNIQUE NOT NULL,    -- "oakland"
  description text,
  created_at timestamptz,
  updated_at timestamptz
)
```

**Add `community_id` to existing tables:**
- `supplies` — add `community_id uuid REFERENCES communities(id)`, backfill with Sunset & Richmond ID
- `books` — same
- `profiles` — add `community_id uuid REFERENCES communities(id)`, backfill
- `join_requests` — add `community_id`, backfill
- `user_roles` — add `community_id`, backfill
- `supply_requests` — add `community_id`, backfill

**Backfill:** Insert the Sunset & Richmond community row first, then UPDATE all existing rows to reference it.

**Update RLS policies** on all modified tables to scope reads/writes by community_id. Use a helper function `get_user_community_id(uuid)` to look up a user's community.

**Update RPCs:**
- `get_supplies_with_owners(p_community_id uuid)` — add parameter and WHERE clause
- `get_books_with_owners(p_community_id uuid)` — same
- `get_public_illustrations(p_community_id uuid)` — same
- `search_supplies_public(search_query, p_community_id uuid)` — same

### Routing (App.tsx)

Add a `/:communitySlug` route that renders the same `Index` page but with community context:

```text
/                    → Landing page (no change)
/oakland             → Index with CommunityContext = "oakland"
/oakland?tab=browse  → Browse Oakland supplies
/start-community     → Start community form (no change)
/steward             → Steward dashboard (scoped to user's community)
```

### React Context (new file: `src/contexts/CommunityContext.tsx`)

Provides `{ communityId, communitySlug, communityName }` to all child components. The `/:communitySlug` route component fetches the community row by slug and populates this context. All data hooks read from it.

### Hook Updates

- `useSupplies` — accept `communityId` from context, pass to RPC
- `useBooks` — same
- `useCrossCommunitySearch` — scope to community
- All steward dashboard queries — scope by `community_id`

### Component Updates

- **`Index.tsx`** — read `communitySlug` from `useParams()`, fetch community, wrap in `CommunityProvider`
- **`CatalogHeader`** — show community name instead of hardcoded "Community Supplies"
- **`LandingPage`** — "Active Communities" section fetches from `communities` table dynamically
- **`AuthGuard`** — check vouching within the user's community context
- **`AddSupply` / `BulkAddSupplies`** — include `community_id` in inserts
- **`BrowseSupplies`** — no direct changes (inherits from `useSupplies` which uses context)
- **`StewardDashboard`** — all sub-components scope queries by community_id from context
- **`JoinRequestForm`** — include `community_id` in join request

### Steward Provisioning Flow

When a community request is approved (from the Communities tab in steward dashboard):
1. Insert a row into `communities` with chosen name/slug
2. Create user accounts for steward + co-stewards via `bulk-create-users` edge function
3. Insert `steward` role in `user_roles` scoped to the new `community_id`
4. Update the `community_steward_requests` row status to `approved`

This will be a button in `CommunityRequestsManager` — "Approve & Create Community" — with a small form for the slug.

### Files to Create
- `src/contexts/CommunityContext.tsx` — React context + provider + hook
- 1 database migration (communities table, add community_id columns, backfill, update RPCs, update RLS)

### Files to Modify
- `src/App.tsx` — add `/:communitySlug/*` routes
- `src/pages/Index.tsx` — read slug param, wrap in CommunityProvider
- `src/hooks/useSupplies.ts` — pass community_id to RPC
- `src/hooks/useBooks.ts` — pass community_id to RPC
- `src/components/CatalogHeader.tsx` — show community name
- `src/components/LandingPage.tsx` — fetch communities dynamically
- `src/components/AddSupply.tsx` — include community_id in insert
- `src/components/BulkAddSupplies.tsx` — include community_id in insert
- `src/components/BrowseSupplies.tsx` — minor (context-aware)
- `src/components/auth/AuthGuard.tsx` — community-scoped vouching
- `src/components/community/JoinRequestForm.tsx` — include community_id
- `src/components/steward/StewardDashboard.tsx` — pass community context
- `src/components/steward/CommunityOverview.tsx` — scope by community_id
- `src/components/steward/CommunityRequestsManager.tsx` — add approve/create flow
- `src/components/steward/AllSuppliesManager.tsx` — scope by community_id
- `src/components/steward/SupplyRequestsManager.tsx` — scope by community_id
- `src/components/steward/JoinRequestsManager.tsx` — scope by community_id
- `src/components/steward/BulkEmailSender.tsx` — scope by community_id
- `src/pages/MySupplies.tsx` — scope queries
- `src/pages/MyBooks.tsx` — scope queries

### Implementation Order
1. **Database migration** — communities table, columns, backfill, RPCs, RLS
2. **CommunityContext + routing** — context provider, App.tsx routes, Index.tsx integration
3. **Hook + component updates** — useSupplies, useBooks, all components reading/writing data
4. **Steward provisioning** — approve button in CommunityRequestsManager
5. **Landing page** — dynamic community directory from DB

### Risk Mitigation
- Backfill ensures the existing Sunset & Richmond community keeps working immediately
- All new `community_id` columns default to the Sunset & Richmond ID so nothing breaks mid-migration
- The root `/` path continues to work as before (defaults to Sunset & Richmond)

