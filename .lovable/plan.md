## Findings

- Karen’s account exists and she is a steward for **Elon Community Church UCC**, but she has **no saved supplies** yet.
- She has **9 temp image uploads** in `supply-images/tmp/` from today, all around **223 KB**, which means browser compression and storage upload succeeded repeatedly.
- Lovable AI credits are currently available: a direct gateway check returned **200 OK**.
- The AI image-description call works against Karen’s uploaded image in about **2–3 seconds** and returns a valid draft.
- The most likely remaining crash point is **after AI succeeds**, when the current Add Item flow converts the compressed image Blob back into a base64 data URL and stores that string in React state/database. It is smaller than before, but still adds avoidable memory pressure on mobile Safari at exactly the moment Karen described: “AI had generated a description… then it crashed.”
- Storage cleanup is not working for temp images under `tmp/...` because the delete policy requires the first folder segment to equal the user id, but temp uploads are stored under `tmp/`. That leaves temp files behind.
- Bulk Add still uses the older base64 compression path and should be treated as a related risk.

## Proposed changes

1. **Make manual Add Item available first-class**
   - On the Add Item screen, add a simple “Add manually” path that opens the same listing form without requiring a photo or AI.
   - Update the copy so AI is clearly optional, not the default required path.
   - Keep photo upload + AI as a convenience option.

2. **Make AI failure non-blocking**
   - If image upload succeeds but AI drafting fails, still open the form with the photo attached and empty editable fields.
   - Show a friendly message like: “We couldn’t draft the text, but you can finish the listing manually.”
   - Do not force the user to restart.

3. **Remove the post-AI base64 conversion from Add Item**
   - Store the compressed image as a normal Storage public URL instead of converting it back into a base64 data URL.
   - Use the object URL only for the on-screen preview.
   - On publish, insert the Storage URL into `supplies.images` and `image_url`.
   - This removes the remaining avoidable mobile memory spike after AI succeeds.

4. **Fix temp-file storage policy and path**
   - Change temp uploads to live under the user folder, e.g. `{userId}/tmp/{uuid}.jpg`, so existing owner-based storage policies can delete them.
   - Add or adjust storage delete policy if needed so users can clean up their own temp uploads safely.
   - Keep public read access because the AI gateway must fetch the image.

5. **Defer/remove automatic illustration generation from the publish path**
   - The app currently launches `generate-illustration` immediately after publish. That uses AI again and sends the base64 image today.
   - For reliability, stop calling illustration generation automatically from the Add Item submit flow, or invoke it without the uploaded photo since the prompt does not actually use `imageUrl`.
   - Existing steward batch illustration tools can still generate illustrations later.

6. **Bring Bulk Add into the same safer model**
   - Replace its old `FileReader`/base64 upload path with the same memory-safe `compressFile` helper.
   - If AI fails for an item, create an editable manual draft instead of blocking the whole flow.

7. **Verification**
   - Test AI gateway with a small request to confirm credits still work.
   - Test Karen’s uploaded image through the AI prompt.
   - Use browser/network checks on the Add Item flow to confirm: upload succeeds, AI success opens the form, manual path opens the form, publish inserts a supply, and temp cleanup no longer leaves orphaned `tmp/` objects.

## Reply to Karen after deploying

“Thanks, Karen — we found the crash was happening after the AI step had already succeeded, while the browser was handling the photo for the listing. We made AI optional and made the photo flow lighter. You can now either upload a photo and let AI suggest text, or skip AI and write the short description yourself.”