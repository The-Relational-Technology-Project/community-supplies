# Root cause

Last round I switched the card's `<img>` from `object-cover` to `object-contain` — that controls how the browser fits the image inside the tile. But the source URL itself is being cropped *before* it reaches the browser.

`getOptimizedImageUrl(photoUrl, { width: 400, quality: 70 })` rewrites the URL to Supabase's `/storage/v1/render/image/public/` endpoint with only `width=400&quality=70`. When neither `height` nor `resize` is set, Supabase's image renderer defaults to **`resize=cover`** and returns a hard-cropped image. That's why Sisters' laminator, wagon, extension cord, etc. show a tiny center slice — the cropping happens server-side, so `object-contain` on the `<img>` has nothing left to un-crop.

Sunset's cards look fine because they're all `illustration_url` (PNGs already square 1024×1024 with white margin) — cover-cropping a square into a square is a no-op.

# Fix

One change, in `src/lib/imageUrl.ts` — when only `width` is provided (no explicit `height`/`resize`), default `resize` to `contain` so Supabase returns the whole image scaled into the width box, preserving the original aspect ratio. Callers that explicitly pass `resize` keep their behavior.

```ts
// inside getOptimizedImageUrl, after building params
if (!opts.resize && !opts.height) params.set("resize", "contain");
```

That's it. The card already renders with `object-contain` on a white tile, so once the source URL stops cropping, photos display in full like the illustrations.

# Why this also explains the AI-illustration "cropping"

Same code path — illustrations are rendered through `getOptimizedImageUrl(supply.illustration_url, { width: 400, quality: 70 })`. OpenAI returns a true 1024×1024 square, so cover is invisible. Gemini fallback returns a non-square (tall) PNG, and cover then crops it — looking like the bouncer test you ran. With `resize=contain` the Gemini-shaped illustration will also display whole (with a bit of white space top/bottom), and the framing-prompt change from last round still helps push Gemini toward square outputs.

# Out of scope

- No edge function changes.
- No DB / migration changes.
- No other callers of `getOptimizedImageUrl` need updates — they either pass both dims (unaffected) or want this same contain behavior.
