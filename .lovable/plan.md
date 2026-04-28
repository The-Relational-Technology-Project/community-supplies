## Problem

Deb Greene's profile, user_role, and her two supplies ("Tamper", "Ladders") are all assigned to the Sunset/Richmond flagship community (`a0a0a0a0-...-e4e4e4e4e4e4`) instead of Old East Durham (`32ced731-eb7a-41f3-be63-be68db74b255`). That's why her items appear in your local library.

She didn't join your community on purpose — the system silently put her there. The hardcoded Sunset UUID is the default value on the `profiles`, `user_roles`, `supplies`, and `books` tables, and is also the fallback inside `handle_new_user` / `handle_new_user_role` when `raw_user_meta_data.community_id` is missing. If she signed up through a flow that didn't pass that metadata (e.g. an old invite link, the bare `/auth` page, or a join form that didn't forward the slug), she'd land in Sunset by default.

## Fix — Part 1: Move Deb's data to Old East Durham

One migration that updates her three records:

```sql
-- Move Deb Greene (debg@cozad.com / bd6a4897-9d82-476f-97d9-74552ae7a616) to Old East Durham
UPDATE public.profiles
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';

UPDATE public.user_roles
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE user_id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';

UPDATE public.supplies
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE owner_id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';
```

After this runs, Tamper and Ladders will disappear from Sunset/Richmond and show up in Old East Durham, and Deb will see the correct community when she logs in.

## Fix — Part 2: Audit the signup flow (recommended, separate step)

Before approving the data fix, I'd also like to investigate **how** she ended up in Sunset, so this doesn't keep happening to other Old East Durham (and other community) signups. Specifically I'd:

1. Read `JoinRequestForm.tsx`, the auth modal, and any invite-link handler to confirm `community_id` is always written into `supabase.auth.signUp({ options: { data: { community_id } } })`.
2. Check whether there's a path (e.g. signing up from the generic landing page, or an OAuth flow) that bypasses the slug.
3. Look for other users besides Deb whose `profiles.community_id` is Sunset but who clearly belong elsewhere (e.g. recent signups whose `intro_text` or email domain points elsewhere).

I'll only run a query for #3 — no code changes — and report back. If a real bug exists I'll propose a follow-up plan rather than bundling it into this one.

## Verification

- Re-run the supplies query for Deb's items and confirm `community_id = old-east-durham`.
- Refresh your local library — Tamper and Ladders should be gone.
- Confirm Deb (if she logs in) sees Old East Durham at `/c/old-east-durham`.
