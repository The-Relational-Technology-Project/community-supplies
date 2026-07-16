## What happened

Caitlin's latest request came through without an answer because the public join form was trying to fetch `communities.custom_join_question` while the user was anonymous. The database currently allows anonymous users to read public community metadata like slug/name/join mode, but **not** the `custom_join_question` column. That request returns `401`, so the textarea never renders and the request is submitted with `custom_answer = null`.

This explains Quiana's latest CCNC request:
- `cross_streets` populated
- `referral_source = community_member`
- `custom_answer = null`
- live preview shows the CCNC join form without the custom question
- network trace shows `401` on `custom_join_question`

## Plan

1. **Fix public read access for the question**
   - Add a narrowly-scoped database migration granting anonymous read access to `communities.custom_join_question`.
   - This is not PII; it is a steward-authored screening prompt already intended to be shown before signup.
   - Keep existing RLS intact.

2. **Make the form fail closed if the question cannot load**
   - Update `JoinRequestForm` so if the custom-question lookup errors, it does **not** silently proceed.
   - Show a clear inline/error toast asking the user to retry, rather than submitting an incomplete application.

3. **Harden the logged-in join path the same way**
   - Update `JoinThisCommunity` to track whether the community settings loaded successfully.
   - For approval-required communities, do not allow submit until join mode + custom question have loaded.

4. **Make Caitlin's steward view clearer**
   - Update `JoinRequestsManager` so it always shows the custom question row in expanded details when a community has one.
   - If the stored answer is missing, show “No answer recorded” instead of omitting the field entirely. This makes legacy broken requests obvious rather than invisible.

5. **Verify**
   - Re-open `/c/columbia-city-neighbors-club` anonymously and confirm the join dialog displays “What is a Columbia City Neighbors Club event you have attended?”
   - Confirm the relevant Supabase request no longer returns `401`.
   - Existing rows with `custom_answer = null` cannot be recovered, but new requests should capture the response.