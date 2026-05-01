# Discovery → Join Flow Polish

Four targeted improvements so visitors landing from the map have a smooth, confidence-building path into a community.

## 1. Map tooltips + bigger tap targets (`SpreadMap.tsx`)

Make discoverable pins informative and easy to hit:

- Wrap each discoverable `<Marker>` in a Radix `HoverCard` (desktop hover) + `Popover` (mobile tap) so users see the community name, public location label, and join mode ("Open to apply" vs "Auto-join") before clicking through.
- Increase pin radius from 5 → 7, and add a transparent 14px hit-circle behind each pin for easier mobile tapping.
- Add a subtle pulse animation (Tailwind `animate-pulse` on a secondary ring) to discoverable pins so they read as "active" vs the static anonymous dots.
- Tooltip CTA: "Visit community →" linking to `/c/:slug`.

## 2. Discoverable communities list (new `DiscoverableCommunitiesList.tsx`)

Below the map, render a responsive grid of cards (one per discoverable community). This solves overlapping-pin problems and gives mobile users a non-map entry point.

Each card shows:
- Community name (serif, deep-brown)
- `public_location_label` (e.g., "Sunset & Richmond, San Francisco")
- Join mode badge: "Apply to join" or "Open — join instantly"
- Short `description` excerpt (first ~140 chars) if present
- "Visit community →" link to `/c/:slug`

Data source: reuse the existing `get_discoverable_communities` RPC result already fetched by `SpreadMap` — lift state up or expose via a small shared hook (`useDiscoverableCommunities`) so we fetch once.

Sort alphabetically by name. Empty state: hide the section entirely when none exist.

## 3. Community landing page context (`src/pages/Index.tsx` / community-routed view)

When someone lands on `/c/:slug` from the map, they currently see the catalog/auth gate without context about the community itself. Add a compact hero above the existing content (only shown to non-members on discoverable communities):

- Community name (already in context)
- `public_location_label` and member count (count via `profiles` filtered by `community_id` — add a small RPC `get_community_public_stats(slug)` returning `{ member_count, supply_count, book_count, description, public_location_label, join_mode }`)
- Description text
- 3 stat chips: "N neighbors • N supplies • N books"
- Primary CTA: "Request to join" (scrolls to / opens `JoinRequestForm`)

Members and signed-in users in this community skip the hero (it's a recruiting surface, not a logged-in surface).

## 4. JoinRequestForm post-submit success state (`JoinRequestForm.tsx`)

Replace the "clear all fields + toast" pattern with a dedicated success view rendered in place of the form:

- Heading: "You're on the list!"
- Bulleted "What happens next":
  1. A community steward will review your request (usually within 1–2 days).
  2. You'll get an email at `{email}` once approved.
  3. After approval, sign in to browse and request supplies.
- Note about the verification email Supabase already sends (check inbox / spam).
- Secondary link: "Back to home" → `/`.

Track success via local `submitted` boolean state. Keep the toast for transient feedback but the inline state is the primary signal.

## Technical Notes

- New RPC `get_community_public_stats(p_slug text)` — `SECURITY DEFINER`, returns a single row with non-sensitive fields. Safe for `anon`.
- New shared hook `src/hooks/useDiscoverableCommunities.ts` — TanStack Query wrapper around `get_discoverable_communities` with 5-min stale time so map + list share one fetch.
- Tooltip layer: use `<HoverCard>` (already in project) with `<PopoverPrimitive>`-style touch handling. `react-simple-maps` `<Marker>` renders SVG, so wrap the trigger in a `<g>` and use a foreignObject-free approach: portal the HoverCard to body via Radix defaults, anchor on the SVG node.
- Hero only renders when `community.discoverable === true` AND viewer is not a vouched member of that community. Pull `discoverable` via the existing slug-resolution query in `CommunityContext` (add the field to the select).
- All four changes are additive; no DB schema changes beyond the new read-only RPC.

## Files

- edit: `src/components/SpreadMap.tsx` (tooltips, larger hit targets)
- new: `src/components/DiscoverableCommunitiesList.tsx`
- new: `src/hooks/useDiscoverableCommunities.ts`
- edit: `src/components/LandingPage.tsx` (mount the list under the map)
- new: `src/components/community/CommunityHero.tsx`
- edit: `src/pages/Index.tsx` (mount hero on `/c/:slug` for non-members)
- edit: `src/contexts/CommunityContext.tsx` (also fetch `discoverable`, `public_location_label`, `description`)
- edit: `src/components/community/JoinRequestForm.tsx` (success state)
- new migration: add `get_community_public_stats(text)` RPC
