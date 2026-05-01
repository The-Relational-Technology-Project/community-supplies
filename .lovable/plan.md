## Goal

Public discovery map at `communitysupplies.org` showing the spread of Community Supplies. All existing communities appear as **anonymous coarse pins** so visitors see the footprint. A community only becomes **named, clickable, and joinable** from the map after its steward explicitly opts in via the new "discoverable" setting.

US-only map. International communities listed as a text sidebar ("Also planted abroad: London, Amsterdam, Tijuana, …") with no map pin.

---

## Security analysis

### What changes about the trust boundary

Today communities are unlisted — you need a slug to land on one. After this:

- **Anonymous pins**: every US community gets one dot at **city centroid** (not ZIP). No name, no slug, no tooltip text, no link. The public RPC returns only `{ lat, lng }` for these — nothing identifying.
- **Named pins** (opt-in only): when a steward enables `discoverable`, their pin gets a name, a `public_location_label`, and links to `/c/:slug`. ZIP-level precision (centroid + small jitter).

### Threats and mitigations

1. **Anonymous pins leaking identity by correlation**
   - Risk: a city like Cheyenne, WY with one community + a known steward name visible elsewhere = de-anonymized.
   - Mitigation: use **city centroid only** for anonymous pins (typically ~5–20 km radius), never ZIP. The geocoding for anonymous pins is derived server-side from the existing free-text `description` field, rounded aggressively (2 decimal places ≈ 1.1 km, then snapped to city centroid). Pins in the same metro stack as a single visual dot until one of them opts in.
   - Crucially: the public RPC for anonymous pins returns **only `{ lat, lng }`** — no id, slug, name, or label. There is nothing in the response payload that links a pin to a community row.

2. **Doxxing of stewards via opted-in pins**
   - Risk: ZIP centroid + steward name (visible to logged-in members) → home neighborhood.
   - Mitigation: ZIP centroid only, +deterministic jitter ≤1 km. Never expose street address. `public_location_label` is steward-controlled free text, defaulting to a clean version of the existing `description` for them to review. Never auto-publish a label they haven't seen.

3. **Discoverable + auto-join = open spam target**
   - Mitigation: clicking the `discoverable` toggle **auto-flips** `join_mode` to `approval_required`. Steward can override back to auto, but only after dismissing an explicit warning modal.

4. **Opt-in must be explicit, default off, revocable**
   - All existing communities: `discoverable = false`. Migration does not flip anyone on.
   - Toggling off removes the named pin within 5 min (cache TTL). The community stays as an anonymous pin.

5. **Tightening write access to discovery fields**
   - Current update policy on `communities` lets any steward update any community. Tighten to: steward AND member of that community.
   - `latitude` / `longitude` are written **only** by an edge function (service-role). Steward UI submits ZIP / city; function resolves and writes coords. Prevents a steward plotting a false pin.

6. **The existing `description` field is already public**
   - Today `select * from communities` works for `anon`. Existing free-text `description` (e.g. "Excelsior Springs, Missouri", or worse, a street address) is already exposed. We will:
     - Stop using `description` on the public landing UI.
     - For anonymous pins: server-side geocode from `description` once (offline script in this project, output review by user before commit) → snap to city centroid → store in new `coarse_latitude` / `coarse_longitude`. The raw `description` remains in the DB but the public map endpoint never returns it.
     - **Audit step before launch**: I'll generate a list of all current `description` values for you to scan for anything that looks like a precise address. Anything sketchy gets cleared before the migration that adds `coarse_latitude`/`longitude`.

7. **Geocoding without a third-party API**
   - Bundle a static US `zip_centroids` table (public dataset, ~42k rows, ~1 MB) and a `city_centroids` lookup keyed off a normalized "City, ST" string parsed from `description`. No live geocoding API → no third-party leak, no rate limits, no cost.
   - Communities whose `description` doesn't match a known US city get **no anonymous pin** and are listed in the international sidebar (manually curated by you on first load).

8. **Enumeration**
   - `get_discoverable_communities()` is intentionally enumerable but capped at 500 rows.
   - `get_anonymous_pins()` returns just `{ lat, lng }[]`, also capped at 500.
   - Both cached in `site_config` keys (`map_named_pins`, `map_anonymous_pins`), refreshed by an edge function on a 5-minute boundary or on steward write — same pattern as `landing_illustrations`.

9. **RLS for new columns**
   - `discoverable`, `zip_code`, `country_code`, `latitude`, `longitude`, `coarse_latitude`, `coarse_longitude`, `public_location_label` all live on `communities`.
   - Public `select` policy stays (slug routing depends on it) but the public map UI uses the SECURITY DEFINER RPCs that whitelist columns instead of `select *`.
   - Anonymous client never sees `coarse_latitude`/`coarse_longitude` joined to a community identity — the RPC strips it.

### Residual risks

- A city with exactly one community and a public steward (e.g. featured in a press article) is identifiable from an anonymous pin. Acceptable; this is true today via Google.
- Jitter is deterministic per community so pins don't dance between page loads — that means the jitter offset is technically reverse-engineerable. We don't expose the salt, and the offset is small enough that "true ZIP" can't be derived. Acceptable.
- The seed `description` audit relies on you spot-checking ~125 rows. I'll surface the list to you before the geocoding migration runs.

---

## Implementation plan

### 1. Pre-migration audit (no code change, just review)

I'll print the current `id, name, slug, description` for all 125 communities so you can flag any `description` containing a street address. Anything you flag, I clear before geocoding.

### 2. Database migration

```sql
ALTER TABLE public.communities
  ADD COLUMN discoverable boolean NOT NULL DEFAULT false,
  ADD COLUMN zip_code text,
  ADD COLUMN country_code text DEFAULT 'US',
  -- ZIP-level (only when discoverable + opted-in)
  ADD COLUMN latitude numeric(9,6),
  ADD COLUMN longitude numeric(9,6),
  ADD COLUMN public_location_label text,
  -- City-level (every US community, anonymous)
  ADD COLUMN coarse_latitude numeric(9,6),
  ADD COLUMN coarse_longitude numeric(9,6),
  ADD COLUMN intl_label text;  -- e.g. "London, UK" for sidebar listing

-- Tighten update policy
DROP POLICY "Stewards can update communities" ON public.communities;
CREATE POLICY "Stewards can update own community" ON public.communities
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'steward') AND user_in_community(auth.uid(), id));

-- Public RPC: named pins (opted in)
CREATE FUNCTION public.get_discoverable_communities()
RETURNS TABLE(slug text, name text, public_location_label text,
              latitude numeric, longitude numeric, join_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug, name, public_location_label, latitude, longitude, join_mode
  FROM public.communities
  WHERE discoverable = true AND latitude IS NOT NULL
  LIMIT 500;
$$;

-- Public RPC: anonymous pins (every US community, no identity)
CREATE FUNCTION public.get_anonymous_pins()
RETURNS TABLE(lat numeric, lng numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coarse_latitude, coarse_longitude
  FROM public.communities
  WHERE coarse_latitude IS NOT NULL AND discoverable = false
  LIMIT 500;
$$;

-- Public RPC: international labels (sidebar)
CREATE FUNCTION public.get_intl_communities()
RETURNS TABLE(intl_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT intl_label FROM public.communities
  WHERE intl_label IS NOT NULL ORDER BY intl_label LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION
  public.get_discoverable_communities,
  public.get_anonymous_pins,
  public.get_intl_communities
TO anon, authenticated;
```

Plus a `zip_centroids(zip text PK, lat numeric, lng numeric, city text, state text)` table seeded from a public US ZIP dataset.

### 3. One-off backfill script

A node script (run via `code--exec`, not committed as a migration) that:
- Loads each community's `description`.
- Tries to parse "City, ST" or "City, State" → look up city centroid.
- Writes `coarse_latitude`, `coarse_longitude` for US matches.
- Writes `intl_label` for non-US strings (e.g. "London, UK", "Tijuana, MX").
- Reports unmatched rows for you to handle manually.

### 4. Edge function: `geocode-community`

- Auth: caller must be steward of `communityId`.
- Input: `{ communityId, zipCode, locationLabel }`.
- Looks up `zip_centroids[zipCode]`, applies deterministic jitter, writes `latitude`/`longitude`/`zip_code`/`public_location_label`.
- Returns coords for steward preview.

### 5. Steward UI

**`StartCommunityForm.tsx`** (onboarding):
- New optional section "Help neighbors find this community" (collapsed by default).
- Checkbox `List my community on the public map`.
- When checked: ZIP input + `Public location label` (pre-filled with what they typed for location).
- Notice: "We'll switch your community to 'request to join' so you can review new members. You can change this later."

**New `CommunityVisibilitySettings.tsx`** (added to steward dashboard, replacing/augmenting `JoinModeToggle`):
- Toggle `Discoverable on public map`.
- When toggled on:
  - Auto-flip `join_mode` to `approval_required` (silent if already there; otherwise show toast).
  - Show ZIP + label fields.
- Below the toggle, a separate `Membership` toggle for `auto-join` vs `approval`.
- If steward sets `discoverable = true` AND `join_mode = auto`: blocking modal — *"Anyone who finds your community on the map can join with one click. We strongly recommend 'Request to join' for publicly listed communities. Continue with auto-join?"* — confirm/cancel.

### 6. Public landing map

- New `<DiscoveryMap />` component, mounted in `LandingPage.tsx` between the community ticker and the "Start your own" CTA, only on the generic landing (not `isCommunitySpecific`).
- Three RPC calls (TanStack Query, `staleTime: 5 min`):
  - `get_anonymous_pins` → small light-terracotta dots, no interactions.
  - `get_discoverable_communities` → larger primary-colored pins, hover tooltip with `name` + `public_location_label`, click → `/c/:slug`.
  - `get_intl_communities` → sidebar list "Also planted abroad" (no map pins).
- Stats line ("125 neighborhoods across N states") computed from the RPCs.
- Port the d3 + topojson rendering from your uploaded HTML, restyled with Tailwind tokens (terracotta, sand, deep-brown, serif headings).
- Stat counters animate in; pins fade in on load.
- Empty state never triggers in practice (we'll always have ≥1 pin).

---

## Files to add / change

- `supabase/migrations/<ts>_discovery_map.sql` — schema, RPCs, tightened update policy
- `supabase/migrations/<ts>_zip_centroids.sql` — table + seed
- `scripts/backfill-coarse-coords.ts` — run via `code--exec`, populates `coarse_latitude`/`longitude`/`intl_label` from existing `description`
- `supabase/functions/geocode-community/index.ts` — new
- `src/components/landing/DiscoveryMap.tsx` — new (d3 + topojson)
- `public/us-states-topo.json` — topojson asset
- `src/components/LandingPage.tsx` — mount `<DiscoveryMap />`
- `src/components/community/StartCommunityForm.tsx` — discoverable opt-in section
- `src/components/steward/CommunityVisibilitySettings.tsx` — new combined visibility + membership card
- `src/components/steward/StewardDashboard.tsx` — replace `JoinModeToggle` with the new card
- `package.json` — add `d3-geo`, `d3-selection`, `topojson-client`

---

## One thing I need confirmation on before I build

**Anonymous pins for non-opted-in communities — is that OK?** I'm planning city-centroid pins with no name/slug/link, just dots showing footprint. That's interpretation **(A)** from above. Confirm or correct before I implement. If you'd rather show *nothing* until opt-in (no spread visualization on day 1), say so and I'll drop the anonymous-pin layer entirely.