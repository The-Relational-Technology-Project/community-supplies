
# Three fixes

## 1. Photos look "zoomed in" on cards

In `SupplyCard.tsx`, real photos render with `object-cover` inside the square tile. Combined with `getOptimizedImageUrl(photoUrl, { width: 400 })` (which preserves aspect ratio at the URL level), a tall or wide photo gets center-cropped hard — that's why the laminator, wagon, dolly, etc. show a tiny slice of the product. Illustrations already render with `object-contain` and look correct.

**Fix:** render `thumb_url` photos the same way as illustrations — `object-contain` on a white tile, with the name as a subtle backdrop while loading. This shows the whole product, matches the illustration treatment, and keeps the grid visually uniform.

(No DB change. Just `SupplyCard.tsx`.)

## 2. AI illustration cropping is off (baby bouncer test)

The current `generate-illustration` tries OpenAI first (`openai/gpt-image-2`, square 1024) and falls back to Gemini on 4xx/5xx. Your baby bouncer ended up Gemini-shaped because OpenAI rejected or errored — and the Gemini call has **no size/aspect hint**, so Gemini returns whatever ratio it likes and the tall result looks cropped inside the square card.

**Fix the Gemini path** (so the fallback is safe even when OpenAI declines):

- Append explicit framing instructions to the prompt for the Gemini branch: "Output a **square 1:1 image** with the entire object fully visible, centered, with generous white margin on all sides. Do not crop any part of the object."
- Keep OpenAI as the first attempt (it enforces 1024×1024 server-side, so it's still the safer default when it works).
- Log which provider produced each result so we can see in function logs whether OpenAI or Gemini is being used in practice.

No new model added; this is a prompt-level fix to the existing fallback.

## 3. Generate illustrations for every Sisters item

Use the existing `BatchGenerateIllustrations` flow, but scope it to the current community instead of "all supplies missing an illustration site-wide" (today it scans across communities, which is also a small data-isolation smell). Steps:

- Add a `p_community_id` filter to the supplies fetch in `BatchGenerateIllustrations.tsx` (read it from `useCommunity()`).
- Add the same filter in `batch-generate-illustrations/index.ts` — accept `communityId` in the body, verify the caller is a steward of *that* community, and `.eq('community_id', communityId)` on the query.
- Switch the batch function's internal generation call to invoke `generate-illustration` (so we get the same OpenAI-first / fixed-Gemini-fallback behavior as fix #2), instead of duplicating a Gemini-only call inline. One source of truth for prompts and framing.
- After Sisters' run finishes, the cards will fill in with square illustrations and the photo-cropping fix above stops being noticeable for them entirely.

You (overall admin) can kick this off from the Sisters steward dashboard's "Batch Generate Illustrations" card. It processes ~1 item / 2s, so 10 items ≈ 20s, 50 items ≈ ~2 min.

## Technical details

- `src/components/SupplyCard.tsx`: photo branch becomes `<img className="w-full h-full object-contain p-3" />` (mirrors the illustration branch). Keep the name-text loading placeholder.
- `supabase/functions/generate-illustration/index.ts`: extend `callGemini` to append the square-framing instructions to `prompt`; add `console.log('illustration provider:', 'openai' | 'gemini')` before returning.
- `supabase/functions/batch-generate-illustrations/index.ts`: accept `{ communityId }`; validate steward via `has_role` for that community; query `.eq('community_id', communityId).is('illustration_url', null)`; for each row, `await supabase.functions.invoke('generate-illustration', { body: { supplyId, itemName, description, imageUrl } })` instead of calling the gateway directly.
- `src/components/steward/BatchGenerateIllustrations.tsx`: pass `communityId` to the function; filter client-side fetch by `community_id` too (so the progress count matches what the server will process).

## Out of scope

- Re-running base64→storage migration for old rows in other communities.
- Changing the default model order (OpenAI-first stays).
- Any further routing/membership changes.
