

## Upgrade Cross-Community Search: Full-Text Search + Clearer Results

### Two Changes

**1. Replace `ilike` with PostgreSQL full-text search (`to_tsvector`/`to_tsquery`)**

The `search-public-catalog` edge function currently does substring matching. This misses stemmed words ("projectors" vs "projector") and semantic adjacency. We'll switch to `to_tsvector('english', name || ' ' || description)` matched against `plainto_tsquery('english', query)`. This gives stemming, stop-word removal, and proper word-boundary matching out of the box.

No migration needed -- we can do this purely in the edge function query using raw SQL via `.rpc()` or by creating a small database function. A dedicated `search_supplies_public` RPC function keeps things clean and lets us add a GIN index later for performance.

**2. Change the response format from category counts to a total match count**

Instead of `[{ category: "Electronics", count: 2 }]`, return a single `matchCount: number`. The UI will then show something like:

> **2 matching items** found in **Inner Sunset Shares**
> Want to see full details? Join Inner Sunset Shares →

This is immediately understandable -- no one needs to parse category breakdowns.

### Database

**Migration: Create a `search_supplies_public` function + GIN index**

```sql
-- GIN index for full-text search performance
CREATE INDEX idx_supplies_fts ON public.supplies
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Security definer function callable by service role from the edge function
CREATE OR REPLACE FUNCTION public.search_supplies_public(search_query text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT count(*)::integer
  FROM public.supplies
  WHERE lent_out = false
    AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('english', search_query);
$$;
```

### Edge Function Changes

**`supabase/functions/search-public-catalog/index.ts`**
- Replace the `ilike` query + category grouping with a single call: `supabase.rpc("search_supplies_public", { search_query: query.trim() })`
- Return `{ community_name: string, match_count: number }` instead of `{ community_name, results: [{ category, count }] }`

**`supabase/functions/cross-community-search/index.ts`**
- Update the response mapping to use `matchCount` from `data.match_count` instead of `categories` from `data.results`
- Filter out results where `matchCount === 0`

### Frontend Changes

**`src/hooks/useCrossCommunitySearch.ts`**
- Update `CrossCommunityResult` interface: replace `categories: CategoryResult[]` with `matchCount: number`
- Remove the `CategoryResult` interface

**`src/components/CrossCommunityResults.tsx`**
- Replace the category list with a simple line: "{matchCount} matching {item/items} found in {communityName}"
- Keep the join link as-is

### Steward Guide

**`/mnt/documents/federation-setup-guide.md`**
- Update the "Response format" section to reflect the new `match_count` field
- Note the full-text search upgrade (stemming, word boundaries)
- Mention that neighbor instances should also upgrade their `search-public-catalog` for best results

### Files to create
- 1 database migration (GIN index + `search_supplies_public` function)

### Files to modify
- `supabase/functions/search-public-catalog/index.ts`
- `supabase/functions/cross-community-search/index.ts`
- `src/hooks/useCrossCommunitySearch.ts`
- `src/components/CrossCommunityResults.tsx`
- Regenerate `federation-setup-guide.md`

