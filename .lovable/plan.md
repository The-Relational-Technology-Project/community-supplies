# Fix the join link + add Request Board notifications

Two separate problems from Karen's note. Elon Community Church UCC stays private (`discoverable = false` in the database, 7 members, join mode "auto") — their own invite link is the way in, so the fix is making that link hold.

## 1. Joining by Elon's own link keeps landing people in Sunset

Two confirmed causes in the code:

- **Magic-link sign-in throws away the community.** The "Email me a magic link" flow sends the login email with no return address, so Supabase sends the person to the site root instead of back to `/c/elon-community-church-ucc`. Sign-up already passes the community-scoped return address; magic link does not.
- **The root page silently pretends you're in Sunset.** When there's no community in the URL and the visitor has no community of their own, the app falls back to the Sunset & Richmond community as its context. That's the "just seeing the Sunset and Richmond group" report.

What to build:

- Pass the community-scoped return address on magic-link sign-in, matching sign-up, so the link brings people back to the community page they started from.
- Remember the community someone arrived through (in browser storage) so an email round-trip that loses the URL still returns them to the right place.
- Stop the silent Sunset fallback: with no community in the URL and no community on the profile, the context is "none," and the root page shows a neutral welcome with "have an invite link?" guidance instead of Sunset's library and join button.
- On a community page, if a signed-in visitor's profile belongs to a different community, show a clear "Join Elon Community Church UCC" prompt on that page rather than quietly showing them their other community — this is the existing join/switch flow, just made visible in the wrong-community case.


## 2. Nobody sees new requests

Add per-community, steward-controlled notification settings for the Request Board. **Off by default** — no change in behavior for existing communities until a steward opts in.

Steward dashboard gets a "Request Board notifications" card with three options:

- **Off** (default) — no emails.
- **Notify on each request** — when a member posts a request, every active member of that community gets one email: what's wanted, the note, who asked (first name), and a button to open the Request Board.
- **Weekly digest** — one email per week listing that week's still-open requests. Skipped entirely when there are no open requests, so quiet weeks stay quiet.

Members get a one-click "turn these off for me" link in every email (per-member opt-out, stored on the profile). Stewards see a note that members can opt out.

## Technical details

- `communities`: add `request_notify_mode text not null default 'off'` (`off` | `each` | `weekly`).
- `profiles`: add `request_emails_opt_out boolean not null default false`.
- New edge function `send-request-posted`: JWT-verified, takes the request id, loads the request and community server-side, exits early unless mode is `each`, fetches active non-opted-out member emails with the service role, sends via Resend using the existing branded template pattern (batched BCC-free individual sends like `send-bulk-supply-notification`). Called from `createItemRequest` after a successful insert; failures are logged, never block posting.
- New edge function `send-request-digest`: iterates communities with mode `weekly`, gathers open requests from the last 7 days, sends one email per member. Scheduled weekly with pg_cron + pg_net.
- New unauthenticated edge function (or token link) `request-emails-unsubscribe` for the opt-out link, keyed by a signed profile token so no login is required.
- `AuthModal.handleMagicLink`: pass `emailRedirectTo` built from `communitySlug` (same expression sign-up already uses); persist the arrival slug in `sessionStorage`/`localStorage` and use it as the fallback when the URL has none.
- `CommunityContext`: drop the `DEFAULT_COMMUNITY_ID/SLUG` fallback for the no-slug, no-profile case; expose a null community and let root-page components branch on it. Slug routes are unaffected. Discoverability stays off for Elon — nothing about `get_discoverable_communities` changes.


## Not included

- Cross-community request broadcasting.
- In-app notification center or push notifications.
- Per-member frequency choice beyond on/off (mode is set by the steward).
