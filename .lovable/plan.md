## Why answers are missing

I pulled the last 10 CCNC join requests. The custom question was set on the community 7/8. Since then, three requests came in (Elsie 7/8, Julia 7/9, Martin 7/10) — all have `custom_answer = null` in the database. Cross-street and referral values reveal two different code paths are filing requests, and **both are broken**:

1. **`JoinRequestForm`** (the landing-page "Request to Join" dialog — what Martin used; his row has cross streets + `referral_source = community_member`).
   The form fetches the community's `custom_join_question` in a `useEffect` after mount. If the user submits before that fetch resolves, `customQuestion` is still `null`, so the textarea never renders and `customAnswer` gets saved as `null`. There is no loading gate, no field snapshot, nothing forcing the question to appear.

2. **`JoinThisCommunity`** (what logged-in users see when they click Join on `/c/:slug` — what Julia's row looks like: name = email, no cross streets, no referral source).
   This component calls `fileJoinRequest` with **only name and email**. It never asks for cross streets and never asks the custom question at all — even for approval-required communities like CCNC. That's why some rows have nothing but a name/email.

## Fixes

### 1. `src/components/community/JoinRequestForm.tsx`
- Add a `questionLoaded` flag; set it `true` in the same `useEffect` that fetches `custom_join_question`.
- Disable the submit button and short-circuit `handleSubmit` until `questionLoaded` is `true`.
- Result: the custom-question textarea is guaranteed to render whenever the community has one set, so it can't be silently skipped by a fast submitter.

### 2. `src/components/community/JoinThisCommunity.tsx`
- For approval-required communities, load `custom_join_question` alongside `join_mode`.
- Render a required "Cross streets" input and (if set) a required custom-question textarea inline in the card, replacing the current one-click "Request to join" button with a small form.
- Pass `crossStreets` and `customAnswer` through to `fileJoinRequest`.
- Auto-join path is unchanged.

### 3. No DB changes
Existing null answers stay null — we can't recover data users were never asked for. New requests will carry the answer.

### Verification
- Query `join_requests` for CCNC after deploy: new rows must have `custom_answer` populated.
- Manually walk both paths on `/c/columbia-city-neighbors-club`: (a) landing-page "Request to join" dialog while logged out, (b) logged-in-as-different-community user hitting `/c/columbia-city-neighbors-club` and clicking Join.
