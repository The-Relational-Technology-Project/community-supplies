

## Bulk Upload Items + Auto-Compress Images

### Overview
Two changes: (1) a new "Bulk Add" flow where users upload up to 10 photos at once, AI identifies each item, users review/edit all drafts, then publish them all in one go; (2) auto-compress all uploaded images so users never hit size limits regardless of phone camera resolution.

### Build error fix (prerequisite)
The `send-bulk-update` edge function has a broken Resend import (`npm:resend@2.0.0`). Change it to use the esm.sh CDN import pattern consistent with other functions: `import { Resend } from "https://esm.sh/resend@2.0.0";`

### 1. Auto-compress images everywhere

**`src/lib/imageCompression.ts`** — already compresses to 1200px/0.7 quality. Update it to also handle the initial file-to-dataURL conversion and increase the file size limit messaging. Remove the 5MB check from `AddSupply.tsx` since compression handles any size.

**`src/components/AddSupply.tsx`** — remove the 5MB file size check. Compress before display and before upload. The compressed image (typically 100-300KB) goes to storage and the form.

**`src/components/MultipleImageUpload.tsx`** — same: remove 5MB limit, auto-compress each image on selection.

### 2. Bulk Add flow

**New component: `src/components/BulkAddSupplies.tsx`**

Multi-step flow:
1. **Upload step**: User selects up to 10 photos (grid of thumbnails with add/remove). Each photo is auto-compressed on selection.
2. **Processing step**: On "Analyze All", each image is uploaded to temp storage, sent to `draft-item-from-image`, and results collected. Progress bar shows `3/10 items analyzed...`
3. **Review step**: All drafted items shown as editable cards (name, description, category, condition). Shared fields (neighborhood, cross streets, contact email, house rules) are set once at the top and applied to all items.
4. **Publish step**: On "Publish All", items are inserted to `supplies` in sequence. Illustration generation fires in the background for each. Notification email sent once for the batch.

**`src/pages/Index.tsx`** — add a "bulk-add" tab option that renders `BulkAddSupplies`.

**`src/components/CatalogHeader.tsx`** — add a "Bulk Add" button/tab alongside the existing "Add" tab.

### 3. Edge function: batch notification

**New function: `supabase/functions/send-bulk-supply-notification/index.ts`**

Sends a single notification email summarizing all items added in a batch (item names + categories), rather than one email per item.

### Technical details

- **Image compression**: All images compressed client-side to 1200px max dimension, 0.7 JPEG quality before any upload. Typical output: 100-300KB regardless of input size (iPhone photos are 3-8MB).
- **Storage**: Compressed images uploaded to `supply-images` bucket as temp files for AI analysis, then cleaned up. Final compressed data URLs stored in the `images` column.
- **Rate limiting**: 2-second delay between AI calls during batch processing to avoid 429s. UI shows progress.
- **Error handling**: If AI fails on one image, that item is flagged with an error but others continue. User can retry failed ones or fill in manually.

### Files to create
- `src/components/BulkAddSupplies.tsx`
- `supabase/functions/send-bulk-supply-notification/index.ts`

### Files to modify
- `src/components/AddSupply.tsx` — remove 5MB limit, auto-compress
- `src/components/MultipleImageUpload.tsx` — remove 5MB limit, auto-compress
- `src/pages/Index.tsx` — add bulk-add tab routing
- `src/components/CatalogHeader.tsx` — add Bulk Add navigation
- `supabase/functions/send-bulk-update/index.ts` — fix Resend import
- `supabase/config.toml` — register new edge function

