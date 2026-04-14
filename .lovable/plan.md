

## Self-Service Community Creation + Steward Onboarding

### What We're Building

Transform the existing "Start a Sharing Community" form from a request-and-wait flow into an **instant self-service** flow where a new steward:

1. Fills out the form (name, email, community name, community location, reason, questions, captcha)
2. Creates their account immediately (email/password or magic link)
3. Gets tagged as steward of a brand-new community
4. Lands on an onboarding page with prompts to add first supplies and invite neighbors
5. Their community is live at `/c/{slug}` — visitors see sign-in/sign-up, members see the library

Plus: add Steward Dashboard access at `/c/{slug}/steward` and in the user dropdown menu.

### Implementation Details

**1. Revamp StartCommunityForm → self-service creation**

Update `src/components/community/StartCommunityForm.tsx`:
- Add "Community Name" field with helper text ("e.g., Outer Sunset Sharing, Oakland Community Supplies")
- Add "Location" field ("Where is your sharing community? e.g., Oakland Hills, Mission District SF")
- Auto-generate slug from community name (lowercase, hyphenated)
- Remove co-stewards section (simplify for v1 — steward can invite co-stewards later)
- After captcha validation, show account creation step (email/password + magic link option) instead of submitting a request
- On account creation: call a new edge function that atomically creates community + steward role

**2. New edge function: `create-community`**

`supabase/functions/create-community/index.ts`:
- Accepts: `{ communityName, communitySlug, location, reason, questions, stewardName, stewardEmail, stewardPassword }`
- Uses service role to:
  1. Check slug uniqueness against `communities` table
  2. Insert new `communities` row (name, slug, description = location)
  3. Create auth user via `admin.createUser()` (email confirmed, vouched)
  4. Insert profile with `community_id` set to new community
  5. Insert `user_roles` row with `role = 'steward'` and `community_id`
  6. Optionally store the request in `community_steward_requests` for record-keeping
- Returns: `{ communitySlug, communityId }` on success
- No JWT required (unauthenticated users call this during signup)
- Math captcha validated client-side; rate limit via existing patterns

**3. Database migration**

- Add `location` column to `community_steward_requests` (optional, for record-keeping)
- No other schema changes needed — communities table and community_id columns already exist

**4. Steward onboarding page**

New component: `src/components/community/StewardOnboarding.tsx`
- Shown after successful community creation (via route state or query param)
- Two cards: "Add your first supplies" (link to add supply page) and "Invite your neighbors" (copyable community URL)
- Clean, encouraging design matching the existing aesthetic

**5. Community-aware auth flow**

Update `src/components/auth/AuthGuard.tsx`:
- When showing the "not logged in" screen at a community route (`/c/{slug}`), display the community name instead of hardcoded "Sunset & Richmond"
- Sign-up from a community page should include `community_id` in user metadata so the `handle_new_user` trigger assigns them to the correct community

Update `src/components/auth/AuthModal.tsx`:
- Accept optional `communityId` and `communityName` props
- Pass `community_id` in signup `user_metadata` when provided

Update `src/components/community/JoinRequestForm.tsx`:
- Include `community_id` from context in the join request insert

**6. Steward Dashboard routing**

Update `src/App.tsx`:
- Add route `/c/:communitySlug/steward` that renders a community-scoped steward dashboard

New component: `src/components/steward/CommunityStewardDashboard.tsx`
- Simplified version of `StewardDashboard` with just two tabs: **Members** and **Requests**
- Reuses `CommunityOverview` and `SupplyRequestsManager` (already community-scoped via context)

**7. Steward link in user dropdown**

Update `src/components/auth/UserProfile.tsx`:
- Check if user has steward role (already checking `profile.role`)
- Add "Steward Dashboard" menu item that navigates to `/c/{communitySlug}/steward`
- Read `communitySlug` from `CommunityContext`

Update `src/components/CatalogHeader.tsx`:
- Add steward dashboard link for steward users (similar to Header.tsx pattern)

### Files to Create
- `supabase/functions/create-community/index.ts` — edge function for atomic community + steward creation
- `src/components/community/StewardOnboarding.tsx` — post-creation onboarding UI
- `src/components/steward/CommunityStewardDashboard.tsx` — simplified steward view for community stewards
- 1 database migration (add `location` column to `community_steward_requests`)

### Files to Modify
- `src/components/community/StartCommunityForm.tsx` — self-service flow with account creation
- `src/pages/StartCommunity.tsx` — handle post-creation redirect/onboarding
- `src/App.tsx` — add `/c/:communitySlug/steward` route
- `src/components/auth/AuthGuard.tsx` — community-aware login prompt
- `src/components/auth/AuthModal.tsx` — accept community_id for signup
- `src/components/auth/UserProfile.tsx` — add steward dashboard link
- `src/components/community/JoinRequestForm.tsx` — include community_id
- `src/components/CatalogHeader.tsx` — steward link for steward users

### User Flow Summary

```text
New steward visits /start-community
  → Fills form (name, email, community name, location, reason, captcha)
  → Creates account (email/password or magic link)
  → Edge function creates community + tags them as steward
  → Redirected to /c/{slug} with onboarding overlay
  → "Add your first supplies" + "Invite neighbors (copy URL)"
  → Community is live — visitors at /c/{slug} see sign-in/sign-up

Existing member visits /c/{slug}
  → Not signed in: sees community name + sign-in/sign-up prompt
  → Signed in: sees the library (scoped to that community)

Steward accesses dashboard
  → Via user dropdown menu → "Steward Dashboard"
  → Or directly at /c/{slug}/steward
  → Simplified view: Members tab + Requests tab
```

