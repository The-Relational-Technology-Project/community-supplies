# What I found on `/c/sisters`

Two separate issues, both fixable:

## 1. Photos don't show on cards — caused by our IO fix
Yesterday's migration (`20260605003759_…`) had the `get_supplies_with_owners` RPC return `image_url = NULL` and `images = []` for every row, to keep the list query lightweight (154 rows in the DB still hold heavy base64 blobs). That worked, but it removed the photo from cards entirely. `SupplyCard` then falls back to the category icon (wrench, house, party popper, etc.) — which is exactly what your friend is seeing for everything past the first two items.

Sisters' inventory is fine: every supply has a photo, and **all of them are normal storage URLs** (`https://…supabase.co/storage/…`), not base64. So we can safely send those URLs back in the list — just not the base64 leftovers from older communities.

## 2. AI illustrations look "cropped weird"
`generate-illustration` calls Gemini (`google/gemini-2.5-flash-image`) with no size/aspect hint. Gemini returns whatever ratio it picks, and the card is a square — so a tall or wide illustration ends up letterboxed inside the white tile and the subject reads as small or off-center. There's also no fallback if the AI returns nothing usable.

# The fix

## A. Restore photo thumbnails on cards, without re-bloating the list

Update the RPC `get_supplies_with_owners` to return a small `thumb_url` that's safe by construction:

- For each row, return `image_url` only if it looks like an http(s) URL; otherwise NULL. Same rule for the first entry of `images[]`. Keep `image_url` and `images` themselves as NULL/empty in the list response — only the lightweight `thumb_url` ships.
- This adds ~one short string per row (Sisters: every row gets one; older communities: many rows still get NULL until base64 migration completes). No re-introduction of base64 payloads. RPC return shape gains one column; everything else stays as today.

Update `useSupplies` / `Supply` type / `SupplyCard`:
- Map `thumb_url` into the `Supply` object.
- In `SupplyCard`, render priority becomes: `illustration_url` → `thumb_url` (real photo, `object-cover` so it fills the tile) → "illustration in progress…" → category icon. The "in progress" state now correctly means *photo uploaded, AI working* instead of *photo silently hidden*.

Full-resolution photos in `ContactModal` continue to be fetched on-demand from the row itself (already wired in the previous turn) — modal behavior unchanged.

## B. Fix AI illustration cropping

Switch `supabase/functions/generate-illustration/index.ts` to OpenAI's image model with an explicit square size, which guarantees consistent framing:

- Model: `openai/gpt-image-2`
- Body: `{ model, prompt, size: "1024x1024", quality: "low", n: 1 }` (non-streaming — this is a backend job that uploads the final PNG to storage and returns).
- Parse `data[0].b64_json`, upload to the `supply-images` bucket exactly as today.
- Keep the existing prompt (minimal black-and-white line drawing, no text).
- On a content-policy/4xx rejection from OpenAI, fall back once to Gemini (`google/gemini-2.5-flash-image`) using the messages+modalities shape — different policy, often accepts what OpenAI declines. If both fail, return a clear error so the steward sees what happened instead of a silent failure.

This change is internal to the edge function; no frontend or DB changes required for the cropping fix.

## C. Tell the steward what happened

Once deployed, your friend's existing photos will show on cards immediately (no re-upload needed), and any new "Generate illustration" runs will produce square, well-framed art.

## Technical details

- **Migration**: `CREATE OR REPLACE FUNCTION public.get_supplies_with_owners(...)` — adds `thumb_url text` to the RETURNS TABLE; SELECT clause adds `CASE WHEN s.image_url LIKE 'http%' THEN s.image_url WHEN s.images IS NOT NULL AND array_length(s.images,1) > 0 AND s.images[1] LIKE 'http%' THEN s.images[1] ELSE NULL END AS thumb_url`. Keeps the NULL `image_url` / empty `images` columns as today.
- **Types**: extend `Supply` with `thumb_url?: string | null`; map it in `fetchSupplies`.
- **SupplyCard**: new render branch shows `<img src={getOptimizedImageUrl(supply.thumb_url, {...})} className="object-cover" />` when no illustration is present.
- **Edge function**: replace the chat-completions Gemini call with `/v1/images/generations` for OpenAI; keep storage upload logic.

## Out of scope

- Re-running the base64 → storage migration for the 154 older rows. Those rows simply won't get a `thumb_url` until they're migrated; the rest of the app behaves the same as today for them. Happy to tackle that next if you want.
- Any community-membership / routing changes (already fixed in the previous turn).
