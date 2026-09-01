# Fix community discovery + add Request Board notifications

Two separate problems from Karen's note.

## 1. People can't find Elon Community Church UCC

Confirmed in the database: the Elon community has `discoverable = false` (it has 7 members, join mode "auto"). Almost every community except Sunset & Richmond is set to hidden, because discoverability is off by default and stewards never see a prompt to turn it on.

Also, when a signed-out visitor is on the root site with no community of their own, the app silently falls back to the Sunset & Richmond community as its context. So any join-ish action taken from the root lands them in Sunset.

What to build:

- **Find-a-community search on the root landing page.** A search box that matches community name and area label, so someone typing "Elon" gets there even if they don't have the link. Results link to `/c/<slug>`.
- **Stop the silent Sunset fallback.** When there's no slug in the URL and the visitor has no community, treat the community as "none" instead of Sunset. Root-page join/post actions then point at the find-a-community search rather than at Sunset.
- **Steward nudge.** In the steward dashboard, when a community is hidden, show a clear card: "Neighbors can't find this community by searching — turn on discovery so people who don't have your link can find you." One click to enable (existing discoverability toggle).
- Turn discovery on for Elon Community Church UCC directly (Karen's ask), leaving other communities to their stewards.

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
- Discovery search: extend the existing `get_discoverable_communities` security-definer RPC usage with a name/label filter client-side (list is small), reusing `useDiscoverableCommunities`.
- `CommunityContext`: drop `DEFAULT_COMMUNITY_ID/SLUG` fallback for the no-slug, no-profile case; expose `communityId: null` and let root-page components branch on it. Slug routes are unaffected.

## Not included

- Cross-community request broadcasting.
- In-app notification center or push notifications.
- Per-member frequency choice beyond on/off (mode is set by the steward).
