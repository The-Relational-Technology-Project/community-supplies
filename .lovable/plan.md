## Diagnosis of Ellen's issues

Ellen's community `Uplands Claremont Area Neighbors` was created at 16:19 UTC. Paul, Joe, and Ellen herself all signed up between 17:01 and 22:38 — and were each auto-vouched within seconds. JWTEST (22:44) is the only one correctly held as inactive/pending.

Root cause: **new communities default to `join_mode = 'auto'`** (both the DB column default and `create-community` edge function omit it). The "approval required" toggle in the dashboard does nothing for anyone who signs up during the window before the steward flips it. Ellen toggled approval on sometime between 22:38 (Joe) and 22:44 (JWTEST), which is exactly where the data flips from vouched → null.

Secondary issues confirmed:
- **Paul has no `join_requests` row at all.** He signed up via the header "Sign Up" (AuthModal), which never inserts into `join_requests`. So even with approval mode on, AuthModal silently creates accounts that bypass the review queue. JoinRequestForm is the only path that creates a request row.
- **Members tab conflates "pending approval" and "deactivated"** — both show as "Inactive" with a single "Reactivate" button. JWTEST shows Inactive because his `vouched_at` is null (correct — he is pending), but the UI offers no context and no link to his join request.
- **The JoinModeToggle has no Save button** because it autosaves on toggle; that wasn't obvious to Ellen ("I didn't see a save button").
- Notification frequency: no digest option exists today.
- Designating another steward: no UI exists — currently a manual SQL/admin task.

## Fixes

### 1. Default new communities to approval-required
- Migration: `ALTER TABLE public.communities ALTER COLUMN join_mode SET DEFAULT 'approval_required';`
- `supabase/functions/create-community/index.ts`: explicitly insert `join_mode: 'approval_required'` so the default applies even if a future migration moves it.
- `StartCommunityForm` (community creation UI): add a short note that new communities start in approval-required mode and the steward can switch to open-join later in the dashboard.

### 2. Close the AuthModal bypass
When a user signs up via AuthModal for a community whose `join_mode = 'approval_required'`:
- Insert a row into `join_requests` (mirroring `JoinRequestForm`) so the request appears in the steward's queue.
- Show the "You're on the list — a steward will review" confirmation instead of the generic "Account created" toast.

Leave the auto-join path unchanged for `join_mode = 'auto'` communities.

### 3. Clarify member statuses in the dashboard
Update `CommunityOverview` so each member row shows one of three states:
- **Active** (vouched_at set) — action: Deactivate (with confirm dialog).
- **Pending approval** (vouched_at null AND a pending `join_requests` row exists) — action: a link/button that jumps to the Join Requests tab; no Reactivate button.
- **Deactivated** (vouched_at null AND no pending request) — action: Reactivate.

Also add a confirm dialog to Deactivate to prevent accidental clicks during screen-share (this is what Ellen suspected may have happened).

### 4. Make the join-mode toggle obviously saved
`JoinModeToggle`: add a small "Saved" indicator (or success toast) on change and a one-line helper underneath: "Changes apply immediately — no save needed."

### 5. Data cleanup for Uplands Claremont
Run a one-off SQL fix:
- For the three Uplands members who slipped through (`paul@valenstein.org`, `ej1842@gmail.com`, `joe@wadcan.com`): keep Ellen vouched (she is the de-facto steward there via approval flow we did earlier — actually her account is `sharing@uplandsclaremont.com`, not `ej1842`). So: set Paul, Joe, and the `ej1842` profile back to `vouched_at = NULL`.
- Create `join_requests` rows for Paul (so he shows up in the queue alongside Joe and Ellen-personal). Joe and Ellen-personal already have pending rows.
- Leave UCAN (`sharing@uplandsclaremont.com`) vouched — that's Ellen's steward login.

### 6. Out of scope for this round (mention in reply)
- **Notification digest** (daily/weekly batch): worth doing but a separate feature. Acknowledge and add to backlog.
- **Designating co-stewards**: needs a dedicated UI (invite-as-steward + role grant in `user_roles` scoped to the community). I'll do this manually for Paul + Joe now if you want, and we can build the self-serve UI next.

## Draft reply to Ellen (for your review)

> Hi Ellen — thanks for the careful notes, these were really useful.
>
> Most of what you saw traces back to one bug: new communities were being created in "open join" mode by default, not "approval required." So in the window between when your site was set up this morning and when you flipped the approval toggle later in the day, anyone who signed up was auto-approved. That's why Paul, Joe, and your personal Gmail account all got in without you approving them, and why Paul doesn't appear in the Join Requests list (his account never created a request — it went straight through). JWTEST is the one account that came in after you flipped the toggle, which is why he correctly shows as pending.
>
> What I'm fixing:
> 1. New communities will default to "approval required" going forward.
> 2. The "Sign Up" button (separate from the join form) was also skipping the approval queue — fixing that so every signup for an approval-required community creates a request you can review.
> 3. The Members tab will distinguish "Pending approval" from "Deactivated" so it's clear which is which. Right now both look like "Inactive," which is confusing — and that's also what JWTEST's row was showing you. I don't think you accidentally deactivated him; he was just never approved yet.
> 4. Adding a confirmation step on Deactivate so a stray click during a screen-share can't silently flip someone off.
> 5. Making it clearer that the approval toggle saves automatically — there's no Save button because the change applies the moment you flip it.
>
> For your community specifically, I'll reset Paul, Joe, and your Gmail account back to pending and create the missing request rows so they appear in your Join Requests tab for you to approve properly.
>
> On your other questions:
> - **Daily digest of notifications**: not built yet, but a good idea — I'll add it to the list. For now a Gmail filter is the best workaround.
> - **Designating another steward**: no self-serve UI for that yet. If you want Paul or Joe set up as co-stewards, send me their preferred emails and I'll do it from my end while we build the UI.
>
> Sorry for the rough first day — appreciate you stress-testing it.
>
> — Josh

## Technical summary
- 1 migration (column default).
- 1 data migration (Ellen's community cleanup + Paul join_request insert).
- Edits to: `create-community/index.ts`, `AuthModal.tsx`, `CommunityOverview.tsx`, `JoinModeToggle.tsx`, `StartCommunityForm.tsx`.
