## 1. Move Sajni to Columbia City Neighbors Club

Confirmed: profile `Sajni` / `sajniofficial@gmail.com` is on `sunset-richmond`, target is `columbia-city-neighbors-club` (auto-join). One-off UPDATE setting her `profiles.community_id` and `membership_status = 'active'`.

## 2. Stop defaulting communitysupplies.org to Sunset & Richmond

Today the root path silently treats Sunset as the default for everyone: anonymous visitors see the Sunset-branded hero/join CTA, and `CommunityContext` falls back to Sunset's UUID/slug whenever no profile community is found. That's what tripped up Sajni.

### 2a. Generic landing for anonymous visitors at `/`

In `src/components/LandingPage.tsx`, the community-specific view is gated by `communitySlug !== 'sunset-richmond'`, so root visitors get the Sunset hero. Change root to a generic discovery view:
- Keep the project pitch, `SpreadMap`, and `DiscoverableCommunitiesList` so visitors can find a community near them.
- Replace the Sunset "Join" CTA with "Find your community" (discovery list) + "Start a new community" (`/start-community`).
- Sign-in / sign-up modals stop implying Sunset.

The Sunset-specific landing (hero, member count, join form) stays reachable at `/c/sunset-richmond`, identical to every other community.

### 2b. Sign-in / magic link from `/` lands you in your own community

In `src/pages/Index.tsx`, once a logged-in user is resolved on `/` (no slug), `navigate('/c/<their-community-slug>', { replace: true })` using their profile community. To avoid bouncing users into Sunset by accident, add a `hasProfileCommunity` flag to `CommunityContext` set only when the profile lookup returned a real `communities` row (not the Sunset fallback). Only redirect when that flag is true.

Magic-link / password flows already return to `/`; the redirect carries them onward — no auth-flow changes.

### 2c. Users with no community on `/`

A logged-in user without a profile community (mid-onboarding edge case) stays on `/` and sees the generic discovery + "Start a community" CTAs instead of being silently dropped into Sunset.

## 3. Safety for existing Sunset members and Sunset's neighbors

**Existing Sunset members revisiting communitysupplies.org:** safe. Their `profiles.community_id` points to Sunset, so step 2b auto-redirects them to `/c/sunset-richmond` — same library, same experience. The only visible change is the URL.

**Sunset's neighbors finding it from the root:** Sunset is currently `discoverable=false` with no `latitude`, `longitude`, or `public_location_label`, so it would NOT appear on the `SpreadMap` or `DiscoverableCommunitiesList`. To keep Sunset findable from the new generic landing:
- Update the `sunset-richmond` row: `discoverable = true`, `public_location_label = 'Sunset & Richmond, San Francisco, CA'`, set `latitude`/`longitude` to a Sunset-area centroid (≈ 37.7599, -122.4836). Done as a one-off UPDATE alongside Sajni's fix.
- Sunset will then show up on the map and in the discoverable list just like every other community.

## 4. Out of scope

- No change to `/c/sunset-richmond` itself.
- No change to `DEFAULT_COMMUNITY_ID` used as the RPC fallback — only user-facing routing changes.
- No change to other communities' landing pages.

## Technical notes

Files touched:
- `src/contexts/CommunityContext.tsx` — add `hasProfileCommunity` flag.
- `src/pages/Index.tsx` — redirect logged-in users on `/` to `/c/<their-slug>` when `hasProfileCommunity`.
- `src/components/LandingPage.tsx` — render generic discovery view on `/`; community-specific view continues to render on `/c/:slug`.
- One-off SQL: update Sajni's profile + flip Sunset to discoverable with lat/lng/label.
