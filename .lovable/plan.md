# Request Board

Let members post "I'm looking for ___" when the library doesn't have it, and let neighbors answer by adding that item — with an email back to the requester.

## Flow

```text
Member searches "lawn mower" -> no results
  -> "Ask the community for this" button (also in main nav)
  -> Request post: item wanted, why/when needed, optional notes
Request Board tab: open requests, newest first
  -> Neighbor clicks "I have this"
     -> normal Add Item flow, pre-filled with the requested name,
        tagged as fulfilling that request
     -> on save: request marked "fulfilled", requester emailed with a
        link to the new item + who to contact
  -> Requester can close their own request anytime ("Found it")
```

## What gets built

**Request Board tab** (new tab in the catalog header, next to Browse)
- List of open requests scoped to the community: item wanted, requester first name, date, optional note.
- Filters: Open / Fulfilled / Mine.
- Empty state encouraging the first request.

**Post a request**
- Small form: what you're looking for, category (optional), note about when/why.
- Entry points: the Request Board, plus a "Nobody's shared one yet — ask the community" prompt on empty search results in Browse.

**Fulfilling a request**
- "I have this" on a request opens the existing Add Item flow with `name` pre-filled and the request ID carried through.
- On successful save, the request is linked to the new supply and marked fulfilled.
- Alternative on the same card: "Already in the library" to link an existing item you own, so we don't force a duplicate listing.

**Notifications**
- Email to the requester when their request is fulfilled: item name, illustration/photo, and a link straight to the item in their community library.
- Optional (recommend including): a light weekly digest is *not* part of this — just the direct fulfillment email, to keep noise low.

**Steward controls**
- New "Requests" tab in the steward dashboard to view and remove inappropriate/stale requests.

## Technical details

- New table `public.item_requests`: `community_id`, `requester_id`, `title`, `category`, `note`, `status` (open/fulfilled/closed), `fulfilled_supply_id`, `fulfilled_by`, `fulfilled_at`, timestamps + update trigger.
- GRANTs to `authenticated` and `service_role`; RLS: active members of the community can read and insert; requester can update/close their own; stewards of that community can update/delete. No `anon` access.
- Fulfillment is a `SECURITY DEFINER` RPC (`fulfill_item_request`) so the status flip is atomic and can't be spoofed for another community's request.
- Email sent by a new edge function `send-request-fulfilled` (Resend, same branded template pattern as `send-contact-message`), JWT-verified, recipient email looked up server-side from `profiles` — never passed from the client.
- `AddSupply.tsx` accepts an optional `fulfillRequestId` prop; after insert it calls the RPC and invokes the email function.
- Frontend: `src/components/requests/RequestBoard.tsx`, `RequestCard.tsx`, `NewRequestDialog.tsx`, `src/hooks/useItemRequests.ts` (TanStack Query, community-scoped key), plus a `requests` case in `Index.tsx` and a nav entry in `CatalogHeader.tsx`.

## Not included

- Cross-community request broadcasting (fits the federated-search work later).
- In-app notification center — email only for now.
