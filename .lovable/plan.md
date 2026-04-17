
The user wants a one-shot, reliable way to send these welcome emails — not the fragile batch path. The simplest robust approach: replace the batch flow with a per-steward "Send" button in the existing Steward Welcome panel. Each click triggers one email, sees one real result, and you control exactly who gets one.

Why this fixes things:
- No more `resend.batch.send()` silent-success bug — each call uses `resend.emails.send()` and returns the actual provider response (id or error).
- One recipient = trivial to verify in Resend immediately after click.
- You can send to yourself first as a real test, then click through the rest.

Plan

1. Backend: rework `supabase/functions/send-steward-welcome/index.ts`
   - Keep auth + flagship-steward gate exactly as is.
   - Replace the body schema with two modes:
     - `mode: "list"` (or default) — returns the same recipient list it does today (steward name, email, community name/slug, stewardSince). No sending. This populates the panel.
     - `mode: "send"` with `userId: uuid` — looks up that one steward, builds the email, calls `resend.emails.send()` once, and returns `{ success, id, error, recipient }` based on the actual Resend response.
   - Drop `resend.batch.send` entirely.
   - Add structured `console.log` for: caller, mode, target email, from address, Resend response id or error.
   - Return non-2xx when Resend returns an error so the UI can't show a false success.

2. Frontend: update `src/components/steward/StewardWelcomeBatch.tsx`
   - On open, call the function in `list` mode and render a table of stewards: name, community, email, "stewardSince", and a per-row **Send** button.
   - Each Send button calls the function in `send` mode for that one `userId`, shows a spinner, then shows ✅ with the Resend message id or ❌ with the error message returned by the function.
   - Disable the row's button after a successful send (and show the id) so you don't double-send by accident.
   - Add a "Send test to me" button at the top that sends one email to your own address using the same `send` path with a synthetic recipient — useful as a first sanity check.

3. Verification
   - After deploy: open the panel → click "Send test to me" → confirm in Resend.
   - Then click Send on each real steward row, one by one, watching Resend after each.
   - Edge function logs will show one structured log line per click with the actual Resend id or error.

Files changed
- `supabase/functions/send-steward-welcome/index.ts` — list/send modes, single-recipient sends, real error propagation, structured logs.
- `src/components/steward/StewardWelcomeBatch.tsx` — per-row Send buttons, test-to-me button, real result display.

Out of scope (intentionally)
- Not touching `send-bulk-update` — you said this is a one-time use, so I'll leave the other admin email path alone unless you ask.
- No queueing, no cron, no batching — explicit one-click-per-recipient is the whole point.

Expected outcome
- Every click produces a real, observable send (or a real, observable error) in both the UI and Resend.
- You can confidently send to all current stewards once, then walk away from this feature.
