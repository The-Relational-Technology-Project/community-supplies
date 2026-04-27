## Goal

Stop routing every "new supply / new join request" email to `josh@relationaltechproject.org`. Instead, send each notification to the steward(s) of the community where the event happened. No BCC to Josh.

## Affected edge functions

1. `send-supply-notification` — fired when a single supply is added (`AddSupply.tsx`)
2. `send-bulk-supply-notification` — fired when items are bulk-added (`BulkAddSupplies.tsx`)
3. `send-join-notification` — fired when someone requests to join (`JoinRequestForm.tsx`)
4. `send-community-request-notification` — leave as-is. This fires before any community/steward exists, so Josh is the correct recipient.

## Changes

### 1. Pass `communityId` from the client

- `AddSupply.tsx`: include `communityId` (from `CommunityContext`) in the `send-supply-notification` invoke body.
- `BulkAddSupplies.tsx`: same for `send-bulk-supply-notification`.
- `JoinRequestForm.tsx`: include the `community_id` of the community being joined in the `send-join-notification` body.

### 2. Update the three edge functions

For each function:
- Add `communityId: z.string().uuid()` to the Zod schema.
- Create a Supabase admin client inside the function using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (already configured).
- Look up steward emails for that community by joining `user_roles` (where `role = 'steward'` and `community_id = :communityId`) to `profiles` for the email.
- Look up the community name for the subject/body.
- Set `to:` to the list of steward emails. If none found (defensive fallback only), log a warning and skip sending rather than emailing Josh.
- Update subject lines to include the community name, e.g. `New Supply Added in Old East Durham: Ladders`.

No BCC. Josh is removed entirely from these three flows.

### 3. Leave alone

- `send-community-request-notification` — pre-community, Josh is correct.
- `send-contact-message`, `send-bulk-update`, `send-steward-welcome`, `send-welcome-email` — these are already user-to-user or platform-to-user, not platform admin notifications.

## Out of scope

- No DB schema changes. `user_roles`, `profiles`, and `communities` already have what's needed.
- No steward dashboard UI changes.
- No per-community notification preferences table yet — can add later if stewards want to opt out of certain types.

## Verification

- Add a test supply in Old East Durham; confirm the email goes to the OED steward(s) and not to you.
- Submit a test join request; same check.
- Spot-check Resend dashboard / `email_send_log` to confirm `to:` is the steward, not Josh.
