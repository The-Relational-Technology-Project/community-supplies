# Fix current loading errors + remove confusing CTAs

## What the error is

The console still says CORS in one line, but the real failure is not CORS. Supabase database logs show:

```text
canceling statement due to statement timeout
sql_state_code: 57014
```

That means the signed-in `get_supplies_with_owners` RPC is taking too long and Postgres cancels it. Supabase/Cloudflare then turns that into 500/520 responses, which the browser displays as CORS/failed resource errors.

The anonymous test returned 200 because it returned no rows. The logged-in path is slower because it reaches the real community/member/supply rows.

## Backend fix

Create a migration that:

1. Adds/ensures indexes for the hot paths:
   - `supplies(community_id, created_at desc)`
   - `profiles(id, community_id)` or equivalent
   - same pattern for `books(community_id, title)` if needed

2. Rewrites `public.get_supplies_with_owners(p_community_id uuid)` so the membership check runs once before the row query, not as a helper predicate inside the supply row scan.

   Shape:

   ```sql
   if not exists (
     select 1 from public.profiles
     where id = auth.uid()
       and community_id = p_community_id
   ) then
     return;
   end if;

   return query
   select ...
   from public.supplies s
   left join public.profiles p on p.id = s.owner_id
   where s.community_id = p_community_id
   order by s.created_at desc;
   ```

3. Apply the same safe pattern to `get_books_with_owners(p_community_id uuid)` so books do not inherit the same issue later.

4. Keep the removed-vouching behavior: no `is_user_vouched()` and no `vouched_at` filtering.

5. Preserve multi-tenant isolation: the caller only receives rows for their own `community_id`.

## Frontend cleanup

1. In `src/components/LandingPage.tsx`, remove the logged-out CTA text:

```text
Join to browse all →
```

2. In `src/components/Footer.tsx`, show the Outer Sunset sibling-site bulletin board only for the Sunset community (`sunset-richmond`). Hide these from non-Sunset communities:
   - `outersunset.us`
   - `outersunset.place`
   - `outersunset.today`
   - `cozycorner.place`

3. Also hide the line "Built in the Outer Sunset by neighbors, for neighbors" outside Sunset.

4. Keep general footer links everywhere:
   - Relational Tech Studio
   - contact email
   - Privacy & Terms

## Verification

After the migration:

- Confirm recent logs no longer show `statement timeout` for `get_supplies_with_owners`.
- Confirm the RPC returns 200 quickly for signed-in Sunset requests.
- Confirm supplies render in the Sunset instance.
- Confirm the confusing CTA and non-Sunset Outer Sunset footer links are gone.
