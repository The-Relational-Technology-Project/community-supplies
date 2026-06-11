
## Problem

When a user with an existing account visits another community's page (`/c/<slug>`) and clicks "Join", `supabase.auth.signUp` fails with "user already registered". The `handle_new_user` trigger never runs, so their `profiles.community_id` is never updated. After signing in:

- On `/c/<other-community>`, the membership gate in `src/pages/Index.tsx` sees `profile.community_id !== communityId` and shows the public landing page (looks like "you aren't signed in").
- On `/`, `CommunityProvider` resolves their *old* community from their profile, so magic-link / home routing sends them to the wrong place.

Ryan Levin is the live example: profile is on `sunset-richmond`, he wants `old-east-durham` (auto-join), no `join_request` exists. This pattern will hit any cross-community joiner and anyone whose first signup happened on the root site (which defaults to Sunset & Richmond).

## Fixes

### 1. Data fix for Ryan
Update his profile: set `community_id` to Old East Durham. He already has `vouched_at` set, and OED is `auto`-join, so no approval needed. One-row migration.

### 2. "Switch / join this community" flow on `/c/:slug` for signed-in non-members
In `src/pages/Index.tsx`, when `isSlugRoute && user && !isMember`, instead of rendering `<LandingPage>`, render a new `JoinThisCommunity` card that:

- Shows "You're signed in as <email>. You're currently a member of <currentCommunityName>. Want to join <thisCommunityName>?"
- If target community `join_mode === 'auto'`: a single button "Join <community>" that calls a new RPC `switch_user_community(p_community_id)` (security definer; sets `profiles.community_id = p_community_id`, leaves `vouched_at` alone if already set, otherwise sets it to `now()`). On success, invalidate state and re-render the library.
- If target community `join_mode === 'approval_required'`: a "Request to join" button that inserts a `join_requests` row linked to the existing `user_id` (and clears any old pending request from the same user/community). Approval flow in `JoinRequestsManager` already sets `vouched_at`; extend it to also set `profiles.community_id = request.community_id` on approve so the approval actually moves the user.

### 3. Fix the existing-email path in signup
In `src/components/auth/AuthModal.tsx` `handleSignup`, detect Supabase's "User already registered" error (and equivalent) and, instead of just toasting "Signup failed":

- Toast "You already have an account — sign in to join <community>."
- Switch the modal to `login` mode, prefilled email.
- After successful login, if a `communityId` prop is present and differs from the user's `profiles.community_id`, run the same auto-join or request-to-join path as fix #2 (extract into a small `joinCommunity(communityId, joinMode)` helper).

In `src/components/community/JoinRequestForm.tsx`, mirror the same behavior: if signUp returns "User already registered", look up the existing user via a sign-in step (or skip auth entirely and just insert a `join_requests` row keyed by email; `JoinRequestsManager` approval can match by email when `user_id` is null). Simplest: catch the error, ask them to sign in, then resubmit the request.

### 4. Steward approval should move the profile
In `src/components/steward/JoinRequestsManager.tsx` `handleApprove`, after setting `vouched_at`, also `update profiles set community_id = request.community_id where id = request.user_id`. Today it only sets `vouched_at`, which is why an approval for a cross-community request wouldn't actually move the user even if a request existed.

### 5. Don't silently default root signups to Sunset
Lower-priority but related: `handle_new_user` falls back to the Sunset community when no `community_id` metadata is passed. This is what caused Ryan's profile to live on Sunset in the first place. Options (pick one in build):

- Keep the fallback but make the root `/` signup CTA explicit ("Join Sunset & Richmond Community" already does this — fine).
- OR allow `profiles.community_id` to be null and gate the library UI on it, prompting community selection on first login. (Bigger change — flag for follow-up, not part of this fix.)

We'll implement the lighter version: leave the trigger as-is and rely on fixes #2/#3/#4 to let users correct course.

## Technical details

### Migration (data + RPC)

```sql
-- Move Ryan to Old East Durham
update public.profiles
   set community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 where email = 'ryan.c.levin@gmail.com';

-- RPC used by the "Join this community" button
create or replace function public.switch_user_community(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_join_mode text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select join_mode into v_join_mode from public.communities where id = p_community_id;
  if v_join_mode is null then
    raise exception 'community not found';
  end if;
  if v_join_mode <> 'auto' then
    raise exception 'community requires approval';
  end if;

  update public.profiles
     set community_id = p_community_id,
         vouched_at = coalesce(vouched_at, now())
   where id = v_uid;
end;
$$;

grant execute on function public.switch_user_community(uuid) to authenticated;
```

### Files touched

- `supabase/migrations/<new>.sql` — data fix + `switch_user_community` RPC.
- `src/pages/Index.tsx` — replace the `isSlugRoute && !isMember` branch with the new `JoinThisCommunity` card (new small component under `src/components/community/`).
- `src/components/community/JoinThisCommunity.tsx` (new) — handles both auto and approval modes; on success re-runs the membership check.
- `src/components/auth/AuthModal.tsx` — detect "user already registered" on signup, fall through to login + post-login `joinCommunity`.
- `src/components/community/JoinRequestForm.tsx` — same error handling; allow request submission for existing accounts.
- `src/components/steward/JoinRequestsManager.tsx` — on approve, also set `profiles.community_id = request.community_id`.

### Verification

1. Reload Ryan's account → `/c/old-east-durham` shows the OED library; `/` resolves to OED. (Data migration alone fixes him.)
2. As a second test user, sign up on `/` (lands in Sunset), then visit `/c/old-east-durham` and click "Join" → the new card appears; clicking "Join Old East Durham" moves the profile and shows the library.
3. As a test user, on `/c/<approval-required-community>`, click "Join" → request is created against the existing account; steward approval flips both `vouched_at` and `community_id`.
