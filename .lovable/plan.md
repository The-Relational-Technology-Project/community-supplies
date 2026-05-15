# Fix: Add Item crashes after AI analysis

## Diagnosis
- The edge function `draft-item-from-image` is healthy — recent calls all return 200 in 4–7s. The crash is on the client.
- In `AddSupply.tsx` → `handleImageUpload`, a raw photo is held in memory three times simultaneously (FileReader base64 → `<img>` → canvas → `toDataURL` base64 → `fetch().blob()`). On modern phones a 5–10 MB photo blows past Mobile Safari's per-tab memory budget and the tab silently reloads — exactly matching Karen's "it crashes after analyzing".
- Secondary risk: HEIC photos that some browsers can't decode would currently surface as a generic "Failed to process image" toast, not a clear message.

## Changes

**`src/lib/imageCompression.ts`** — add `compressFile(file)` that uses `URL.createObjectURL` + `canvas.toBlob` and returns `{ blob, previewUrl }`. No base64 round-trip. Surface a clear error if `img.onerror` fires (likely HEIC).

**`src/components/AddSupply.tsx` — `handleImageUpload`**
- Guard: if `file.size > 25 MB`, toast a friendly message and stop.
- Replace the FileReader/nested-callback flow with a flat `async` using `compressFile`.
- Upload the returned `Blob` directly to `tmp/<uuid>.jpg`, pass the public URL to the edge function as today.
- Use the returned object-URL `previewUrl` for `setUploadedImage` (small in React state).
- Wrap each phase (compress / upload / invoke) in its own try so errors are specific.
- Keep the temp-file cleanup in `finally`.

## Out of scope
- No edge-function changes.
- No form/UI redesign.
- Not changing how `images` is persisted on submit (separate issue).

## Verify
- Upload a >5 MB JPEG on the preview — preview renders, AI draft populates, submit succeeds.
- Re-check edge function logs still 200.

## Reply to Karen (after deploy)
> Hi Karen — thanks for flagging this. Large phone photos were overwhelming the browser before the AI step finished. We've shipped a fix; could you try Add Item again? If it still misbehaves, please try a JPEG instead of HEIC.
