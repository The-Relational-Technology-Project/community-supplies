

## Welcome Email for New Community Members

### What we're building

A welcome email sent to every new member with their community's name and URL (`https://communitysupplies.org/c/{slug}`). The email fires:
- **Immediately after signup** for auto-join communities
- **After steward approval** for approval-required communities

### Default join mode

Already correct -- `join_mode` defaults to `'auto'` in the DB migration.

### Implementation

#### 1. New Edge Function: `send-welcome-email`

Uses Resend (consistent with existing notification functions). Accepts `memberName`, `memberEmail`, `communityName`, `communitySlug`. Sends a branded welcome email with:
- Greeting with community name
- Link to their community catalog (`https://communitysupplies.org/c/{slug}`)
- Brief encouragement to browse and share items

File: `supabase/functions/send-welcome-email/index.ts`
Config: `verify_jwt = false` (called from client after auth events)

#### 2. Wire up in `AuthModal.tsx` -- auto-join flow

After successful signup (`handleSignup`), if the community uses auto-join, invoke the welcome email. We need to look up the community's slug and join_mode. Since signup metadata includes `community_id`, we can query the community right after signup to get slug/name/join_mode, then send if auto-join.

#### 3. Wire up in `JoinRequestsManager.tsx` -- approval flow

After steward approves a member (`handleApprove`), look up the member's community info and send the welcome email to the approved member.

#### 4. Update `supabase/config.toml`

Add the new function entry.

### Files changed

- `supabase/functions/send-welcome-email/index.ts` (new)
- `supabase/config.toml` -- add function entry
- `src/components/auth/AuthModal.tsx` -- send welcome email after signup for auto-join communities
- `src/components/steward/JoinRequestsManager.tsx` -- send welcome email after approval

