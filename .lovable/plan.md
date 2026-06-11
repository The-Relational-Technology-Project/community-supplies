## Diagnosis

Ellen (`sharing@uplandsclaremont.com`) created community **Uplands Claremont Area Neighbors** (`ed4143cd…`, `approval_required`) this morning. She is correctly in `user_roles` as `steward` of Uplands. **But her `profiles.community_id` is Sunset (`a0a0a0a0…`), not Uplands.**

The steward dashboard scopes everything through `get_user_community_id(auth.uid())`, which reads from `profiles.community_id`. So every steward query — `JoinRequestsManager`, member list, supply requests — ran against **Sunset & Richmond** (the flagship). That's why she sees 182 "approved members" and a join‑request list full of Sunset neighbors: she's looking at Sunset's data through her steward UI.

Why her profile points at Sunset:

- `public.profiles.community_id` has DB DEFAULT `'a0a0a0a0…sunset…'::uuid`. Any insert that omits `community_id` silently routes the profile to Sunset.
- `create-community` does upsert the profile with the right `community_id`, but auth user metadata + the DEFAULT have already produced a Sunset-scoped row in some race / earlier-deploy path. Same shape of bug we just fixed for Ryan.

This will hit **every** new steward whose profile is created without an explicit `community_id`, and every cross-community joiner (Ryan's exact bug). The RLS predicates `is_user_steward(uid) AND community_id = get_user_community_id(uid)` mean **any steward whose profile drifts to the wrong community sees and can mutate that other community's data**. That's the system-wide issue worth fixing now.

## Fixes

### 1. Data repair for Ellen
- Move `sharing@uplandsclaremont.com` profile to Uplands (`ed4143cd-d1bd-428f-a839-00a107e8bef4`), set `vouched_at = now()` if null.
- No join_requests exist for Uplands, no cleanup needed there.
- Confirm `user_roles` already has her as steward of Uplands (it does).

### 2. Remove the Sunset default on `profiles.community_id`
- Migration: `ALTER TABLE public.profiles ALTER COLUMN community_id DROP DEFAULT;`
- Keep the column NOT NULL.
- Audit every code path that inserts a profile to confirm it sets `community_id` explicitly: `create-community` ✅, `bulk-create-users` (verify), and the `handle_new_user` function (used if/when an auth-user trigger is wired). After the default is dropped, any missing path will fail loudly instead of silently corrupting routing.

### 3. Scope steward RLS by `user_roles`, not by profile
Replace the steward predicate so the steward's authoritative community is the one in `user_roles.role='steward'`, not `profiles.community_id`.

```sql
create or replace function public.is_steward_of(_user_id uuid, _community_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role = 'steward'
      and community_id = _community_id
  )
$$;
grant execute on function public.is_steward_of(uuid, uuid) to authenticated;
```

Update steward-scoped policies to use `public.is_steward_of(auth.uid(), <table>.community_id)`:

- `join_requests` — "Stewards can view community join requests" (SELECT) and "Stewards can vouch community join requests" (UPDATE).
- `profiles` — "Stewards can view community profiles" (SELECT) and "Stewards can update community member vouching" (UPDATE).
- Repeat the same swap on `supplies`, `supply_requests`, `community_steward_requests`, `community_neighbors`, `books` for any steward-scoped policy currently keyed off `get_user_community_id`.

Effect: even if a steward's `profiles.community_id` is wrong, RLS no longer hands them another community's data.

### 4. Explicit `community_id` filter in steward UI
Defense in depth, and fixes any current cross-community leak immediately rather than waiting for the schema change to propagate:

- `src/components/steward/JoinRequestsManager.tsx`: take `communityId` from context (`useCommunity()`), pass `.eq('community_id', communityId)` on the select. Same on Approve/Reject lookups.
- `src/components/steward/CommunityOverview.tsx`, `SupplyRequestsManager.tsx`, `AllSuppliesManager.tsx`, `JoinModeToggle.tsx`, etc.: confirm they all read `communityId` from `useCommunity()` (route-derived) and not from the user's profile. Fix any that don't.
- The dashboard mounted under `/c/:slug/steward` must use the slug's community as the source of truth.

### 5. Harden `create-community`
- After the `auth.admin.createUser` call, run an explicit `UPDATE profiles SET community_id = :communityId WHERE id = :userId` (not just upsert) so we never depend on the column default or trigger ordering.
- Log a server-side warning if the post-update read shows `community_id !== :communityId`.

## Verification

1. **Ellen lands correctly.** After data fix, `sharing@uplandsclaremont.com` on `/c/uplands-claremont-area-neighbors/steward` sees an empty join request list, 1 member (herself), and her own community settings — not Sunset's.
2. **No cross-community leak.** Sign in as a steward of community A, hit `/c/<community-B>/steward` directly — RLS returns nothing for B.
3. **New community signup.** Create a brand new community via the public form; verify the new steward's `profiles.community_id` matches the new community and the dashboard shows only their own data.
4. **Cross-community join (Ryan path).** Existing user joins a second community via "Join this community" — profile flips, steward of the new community sees only their join requests / members.

## Files / migrations touched

- `supabase/migrations/<new>.sql`
  - Data fix for Ellen's profile.
  - `ALTER TABLE profiles ALTER COLUMN community_id DROP DEFAULT`.
  - New `is_steward_of(uuid, uuid)` function + grant.
  - Drop & recreate steward policies on `join_requests`, `profiles`, `supplies`, `supply_requests`, `community_steward_requests`, `community_neighbors`, `books` to use `is_steward_of`.
- `supabase/functions/create-community/index.ts` — explicit post-create profile UPDATE + sanity log.
- `src/components/steward/JoinRequestsManager.tsx` — add `communityId` filter from `useCommunity()`.
- `src/components/steward/CommunityOverview.tsx`, `SupplyRequestsManager.tsx`, `AllSuppliesManager.tsx`, `JoinModeToggle.tsx`, `StewardDashboard.tsx` — audit and lock to route-derived `communityId`.

## What I won't touch unless you say so

- Bulk member-deactivation tooling. Ellen asked if she has to "deactivate each one" — the fix above makes those 182 members vanish from her view because they were never hers. No mass-delete needed. If you want a steward-side "deactivate member" action regardless, that's a separate small feature.