

## Send Welcome Email to New Stewards on Community Creation

### Problem
When a new steward creates a community, they get the onboarding screen in-browser but no email with their community URL. If they close the tab or forget the link, they're stuck (as Edward experienced).

### Solution
Add a welcome email send at the end of the `create-community` Edge Function, using the existing Resend integration. The email includes their community URL, steward dashboard link, and recommended next steps.

### Changes

**`supabase/functions/create-community/index.ts`**:
- After community + user + role creation succeeds, send a welcome email via Resend
- Email includes:
  - Their community URL (`https://sunset-block-party-supplies.lovable.app/c/{slug}`)
  - Steward dashboard link (`/c/{slug}/steward`)
  - Next steps: add first supplies, invite neighbors by sharing the link, manage members from the steward dashboard
- From address: `Community Supplies <josh@relationaltechproject.org>` (matches existing emails)
- Non-blocking: if the email fails, log the error but still return success (community creation is the critical path)

### Email Content (Summary)
- Subject: "Your community is live! Here's your link 🎉"
- Body: congratulations, community URL (prominent CTA button), steward dashboard link, 3 quick next steps (add supplies, invite neighbors, manage from dashboard), sign-off from Josh
- Styled consistently with existing bulk email template (same color palette, layout)

### Files Changed
| File | Change |
|------|--------|
| `supabase/functions/create-community/index.ts` | Add Resend welcome email after successful creation |

One file, no database changes.
