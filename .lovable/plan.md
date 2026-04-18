
Scope based on user feedback:

**1. Easy item editing (item #2)**
- Verify owners can edit their items. Likely path: from `MySupplies` page or supply detail. Need to check current edit affordances and add helper text on the AI draft form like "AI draft — edit anything below before publishing."
- Add an obvious "Edit" button on owner's own items in browse/detail and on `MySupplies`.

**2. Persistent nav with community name as home link (item #3)**
- The Steward page (`/steward`) uses its own header (or none), so users get stranded. Fix: make `CatalogHeader` render on the Steward page too, OR ensure Steward page includes the same header with the community name linking back to `/c/:slug`.
- Confirm community name in `CatalogHeader` is already a home link — it is (`onNavigate?.("home")`), but on `Steward.tsx` the header may differ. Need to check `src/pages/Steward.tsx`.

**3. First-item location handling (item #6)**
- In `AddSupply.tsx` + `draft-item-from-image` edge function: stop AI from inventing neighborhood/cross-streets. Leave both blank for first-time users; they fill in ZIP + cross streets / location markers as free text themselves.
- Tighten edge function prompt: "Do NOT guess location, neighborhood, or cross streets. Always return empty strings for those fields."
- Remove any pre-fill of `neighborhood`/`crossStreets` from `recentItem` when it's the user's first item, and never inject SF defaults.

**4. House Rules delete/edit bug (item #7)**
- Refactor `HouseRules.tsx` to use stable IDs (assign `crypto.randomUUID()` to each rule internally) so removing multiple rules in succession works reliably.
- Make each rule **editable inline** (click to edit, save on blur/Enter) in addition to deletable.
- Dedupe AI-suggested rules on load.

**Files to change:**
- `src/pages/Steward.tsx` — ensure `CatalogHeader` renders so community-name home link is always available.
- `src/components/AddSupply.tsx` — soften AI copy ("AI draft — please review and edit"); skip neighborhood/cross-streets pre-fill from AI; ensure user's manually entered ZIP/cross-streets persist.
- `supabase/functions/draft-item-from-image/index.ts` — instruct AI to return empty location fields; stop returning location pre-fills.
- `src/components/HouseRules.tsx` — internal stable IDs, dedupe, inline edit + reliable delete.
- `src/components/SupplyCard.tsx` or `MySupplies.tsx` — add a clear Edit affordance for the owner (small change; confirm existing path first).

**Out of scope (per user):**
- AI accuracy improvements, profile photos, multi-item add flow changes, illustration fallback to user photo.

**Verification after build:**
- Add first item with no priors → neighborhood/cross-streets stay blank; user types them in → saves correctly.
- Load default house rules → delete two in a row → both stay gone. Click a rule → edit text → saves.
- From Steward dashboard → click community name in header → returns to community home.
- Open own item → Edit button visible → edits save.
