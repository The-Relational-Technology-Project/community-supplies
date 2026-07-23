# Valerie's join issue — diagnosis + fix

## What the data shows

Three auth accounts exist for Valerie:

| Email | Profile community | Status |
|---|---|---|
| `vcsloane@yahoo.com` (the one she's writing from) | Sunset & Richmond SF | pending |
| `vcsloane@rockisland.com` | Sunset & Richmond SF | pending |
| `valerie.kamen84@gmail.com` | Hell's Kitchen | active |

**No join_requests rows exist for any of these emails.** She never made it through a CCNC-scoped join form — both `vcsloane@*` accounts were created against the bare domain (`/`), which pre-fix defaulted new signups to Sunset and left them `pending` with no request on file for stewards to approve.

That matches her symptoms exactly:
- "Magic link is always SF" — her account's `community_id` is Sunset, so the post-login redirect resolves to `/c/sunset-richmond`. Magic links themselves are just email links; the destination is determined by the profile.
- "Password reset doesn't arrive" — she likely signed up passwordless (magic link only), so `resetPasswordForEmail` for an account with no password can be silently dropped by Supabase's rate limiter, or she's typing an email variant she never actually registered.
- Cookies/cache are **not** the problem. Clearing them won't change the server-side profile pinning.

## Fix (data-only, no code changes)

1. Move `vcsloane@yahoo.com` profile → Columbia City Neighbors Club, set `membership_status = 'active'`, set `vouched_at = now()`.
2. Same for `vcsloane@rockisland.com` (so whichever email she remembers works). If Caitlin would rather only admit one, we can skip the rockisland one — flag if so.
3. Leave `valerie.kamen84@gmail.com` alone (active in Hell's Kitchen — unrelated).
4. Reply to Caitlin: it's not a cache issue; Valerie's account was stuck on Sunset from a pre-fix signup. She's now moved to CCNC. She should sign in with `vcsloane@yahoo.com` (or `vcsloane@rockisland.com`) via magic link and will land in CCNC. If password reset still fails, that's because she never set a password — magic link is the correct path.

## Technical details

Migration:
```sql
UPDATE public.profiles
   SET community_id = '635e40a3-8446-4183-81e6-bce5f24b3ea2',
       membership_status = 'active',
       vouched_at = COALESCE(vouched_at, now())
 WHERE id IN (
   '56a53265-862d-448d-8bb1-f383fe9055d2', -- yahoo
   '08c61860-e9aa-44ef-aa25-5435f89c3dbd'  -- rockisland
 );
```

No app code changes — the earlier fixes (removed Sunset default for new signups, slug-scoped join flow, `emailRedirectTo` per community) already prevent this pattern going forward. This is cleanup for accounts stuck from before those landed.
