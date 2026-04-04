

## Secure Cross-Community Federated Search

### Revised Approach

Instead of a public endpoint exposing item names, the system uses:
1. **Federation keys** -- shared secrets exchanged between stewards out-of-band
2. **Category-level results only** -- never expose specific item names across communities

When a user searches and gets zero local results, the system queries neighbor communities and shows: "3 items in Electronics available in [Inner Sunset Shares]" with a link to join that community. No item names, no owner info.

### Database

**Migration: `community_neighbors` table**

```sql
CREATE TABLE public.community_neighbors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  search_endpoint text NOT NULL,
  join_url text NOT NULL,
  federation_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_neighbors ENABLE ROW LEVEL SECURITY;

-- Only stewards can manage
CREATE POLICY "Stewards can manage neighbors"
  ON public.community_neighbors FOR ALL
  TO authenticated
  USING (is_user_steward(auth.uid()))
  WITH CHECK (is_user_steward(auth.uid()));

-- Authenticated users can read (needed for cross-search hook)
CREATE POLICY "Authenticated users can read neighbors"
  ON public.community_neighbors FOR SELECT
  TO authenticated
  USING (true);
```

### Edge Functions

**1. `search-public-catalog` (deployed on every community instance)**

Accepts requests only with a valid federation key (checked against a `FEDERATION_SECRET` env var). Returns category-level counts only:

- Input: `{ query: string, federation_key: string }`
- Output: `{ community_name: string, results: [{ category: "Electronics", count: 2 }, ...] }`
- Searches `supplies.name` and `supplies.description` using `ilike`, groups by category
- Never returns item names, owner info, or images
- Rate limited: max 10 requests per minute per IP

**2. `cross-community-search` (called by the local frontend)**

Requires auth (vouched member). Reads `community_neighbors`, fans out to each neighbor's `search-public-catalog` with the stored federation key. 3-second timeout per neighbor.

- Input: `{ query: string }`
- Output: `[{ communityName, joinUrl, categories: [{ category, count }] }]`

### Frontend

**`src/hooks/useCrossCommunitySearch.ts`**
- Triggers when local search has a query but zero results
- Calls `cross-community-search` edge function
- Returns `{ crossResults, isSearching, hasSearched }`

**`src/components/CrossCommunityResults.tsx`**
- Shown below local results when cross-search finds matches
- Per community card:
  ```
  Also available nearby in [Community Name]:
    • 2 items in Electronics
    • 1 item in Tools
  Want to see full details? Join [Community Name] →
  ```
- Styled as a subtle sand-background card

**`src/components/BrowseSupplies.tsx`**
- Import and render `CrossCommunityResults` below the results grid
- Pass `searchQuery` and `filteredSupplies.length` to the hook

### Steward Dashboard

**`src/components/steward/NeighborCommunitiesManager.tsx`**
- CRUD for `community_neighbors`: name, slug, search endpoint URL, join URL, federation key, enabled toggle
- Added as a new tab in `StewardDashboard.tsx`

### What You'll Need to Share with the Other Steward

After implementation, you'll provide them:
1. **Your instance's `search-public-catalog` endpoint URL** (the edge function URL)
2. **A federation key** you both agree on (generated, shared privately)
3. They set `FEDERATION_SECRET` in their Supabase edge function secrets to that key
4. They deploy the same `search-public-catalog` edge function on their instance
5. You each add the other as a neighbor in your steward dashboards

I'll also generate a simple setup guide document you can send them.

### Files to Create
- `src/hooks/useCrossCommunitySearch.ts`
- `src/components/CrossCommunityResults.tsx`
- `src/components/steward/NeighborCommunitiesManager.tsx`
- `supabase/functions/search-public-catalog/index.ts`
- `supabase/functions/cross-community-search/index.ts`
- 1 migration for `community_neighbors`

### Files to Modify
- `src/components/BrowseSupplies.tsx` -- add cross-community results section
- `src/components/steward/StewardDashboard.tsx` -- add Neighbors tab

