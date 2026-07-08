
## Issues from Caitlin's email + what's actually happening

### 1. Sign-up confirmation email lands people on Sunset & Richmond

**Root cause.** `AuthModal.handleSignup` calls `supabase.auth.signUp` with **no `emailRedirectTo`**, so Supabase falls back to the project's Site URL (the Sunset flagship URL) for the confirmation link. `JoinRequestForm` passes `${origin}/` — better, but still just dumps users at the site root, where the auth-driven redirect only works if their profile row exists *and* its community lookup succeeds. Any hiccup → Sunset fallback.

**Fix.** Always set `emailRedirectTo: ${window.location.origin}/c/${communitySlug}` at signup time (both `AuthModal.handleSignup` and `JoinRequestForm`). Users then land on their actual community's page after confirming, and `JoinThisCommunity` / membership gate takes over.

### 2. No way back from the steward dashboard

Currently, on the in-app `?tab=steward` view, the only nav is the small community-name text in `CatalogHeader`. Not discoverable.

**Fix.** Add a small nav strip at the top of `StewardDashboard` with two obvious buttons: **"Back to community"** (→ `/c/<slug>`) and **"Your profile"** (→ `/profile`). Shown regardless of entry path (tab or `/steward` route).

### 3. Ability to add a custom question to the join request

**Fix.**
- Add nullable `custom_join_question TEXT` column to `communities`.
- Add nullable `custom_answer TEXT` column to `join_requests`.
- In `JoinRequestForm` and `AuthModal` signup flow, if the target community has a `custom_join_question`, render a required textarea with that label; pass through `fileJoinRequest`.
- Show the Q&A in the expandable row of `JoinRequestsManager`.
- Add a new "Join question" card to the steward dashboard (next to `JoinModeToggle`) where a steward can set/edit the question for their community.

Example she wants: "What is a Columbia City Neighbors Club event you have attended?"

### 4. Duplicate join requests & isopod.wispy triplicate

**What actually happened.** `isopod.wispy_9b@icloud.com` has **1 profile / 1 user_id** but **3 approved rows in `join_requests`**. The **members list is correct** (single row) — she is seeing the triplicates in the **Join Requests tab**, not Members. Still, we should prevent this and give her a way to clean it up.

**Fix.**
- Add a partial unique index: `UNIQUE (email, community_id) WHERE status = 'pending'` on `join_requests`. In `fileJoinRequest`, catch the unique-violation and show "You already have a pending request for this community — a steward will review it soon."
- Add a **"Dismiss"** action to non-pending rows in `JoinRequestsManager` that deletes the `join_requests` row (via a new `dismiss_join_request` SECURITY DEFINER RPC scoped to stewards of that community). Deleting a request row does NOT touch the applicant's profile / membership.
- One-time data cleanup migration: delete the 2 older duplicate approved rows for isopod.wispy in CCNC, keeping the most recent.

### 5. Not addressed (out of scope for this plan)

- Rate-limit already exists (`check_join_request_rate_limit`, 3/hr per email) — the isopod case slipped through because all 3 were within the hour and status wasn't checked. The new partial unique index closes that gap for pending rows.
- Nothing else in her email requires a code change.

---

## Files to change

- `src/components/auth/AuthModal.tsx` — add `emailRedirectTo`, custom question field
- `src/components/community/JoinRequestForm.tsx` — fix `emailRedirectTo`, custom question field
- `src/lib/joinCommunity.ts` — accept `customAnswer`, friendly duplicate error
- `src/components/steward/StewardDashboard.tsx` — nav strip
- `src/components/steward/JoinRequestsManager.tsx` — show custom Q&A, "Dismiss" button
- New: `src/components/steward/CustomJoinQuestion.tsx` — steward-editable setting
- Migration: add columns, partial unique index, `dismiss_join_request` RPC, isopod cleanup
- `src/pages/Steward.tsx` — the existing `Back` button stays; nav strip inside dashboard covers the in-tab view

## Reply to Caitlin (draft)

After implementing, we can send her:
1. Confirmation redirects now land on your community, not Sunset.
2. Steward dashboard has "Back to community" and "Your profile" buttons.
3. You can set a custom join question in the dashboard — try "What is a Columbia City Neighbors Club event you have attended?"
4. Duplicate pending requests are now blocked; a "Dismiss" button lets you clean up extras. We already de-duplicated isopod.wispy's rows.
