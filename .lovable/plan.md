## What I found

- Karen can add an item without a photo, so auth, membership, and the basic `supplies` insert path work.
- Karen’s recent photo attempts did upload successfully to `supply-images` under her user folder. There are two compressed JPEG uploads around 223 KB.
- No photo-backed supply record was created after those uploads.
- That points to the remaining failure happening after photo upload, most likely when the current Add Item flow still invokes AI drafting and updates the form afterward on mobile Safari/WebKit.
- Because iPhone browsers all use WebKit, DuckDuckGo and Safari failing the same way is consistent with the same client-side crash path.

## Product behavior to build

1. **Make photo upload independent from AI**
   - On Add Item, provide separate choices:
     - Add a photo and write it myself
     - Use AI to draft from a photo, only when AI is enabled
     - Add without a photo
   - The “photo + write it myself” path will compress and upload the photo, open the form, and never call AI.
   - This should be the safe path for Karen.

2. **Make AI optional when enabled**
   - If a community has AI enabled, AI appears as a convenience option, not the default required path.
   - Users can still bypass AI completely for both descriptions and illustrations.
   - Any AI failure preserves the uploaded photo and keeps the manual form usable.

3. **Add community-level AI setting**
   - Add a `communities.ai_features_enabled` field with default `true`.
   - Existing communities will automatically remain AI enabled unless a steward turns it off.
   - Steward-only RLS already allows stewards to update their own community, so this setting fits the existing access model.

4. **Expose AI settings during onboarding**
   - In the community creation flow, add a clear AI toggle with default on.
   - When on: explain simply that AI can draft item descriptions from photos and generate catalog-style illustrations.
   - When off: explain simply that members can still upload photos and write their own descriptions, and illustration generation will be hidden.
   - Pass the selected setting into the `create-community` edge function so new communities are created with the steward’s choice.

5. **Expose AI settings in the Steward Dashboard**
   - Add an “AI Features” settings card in the steward dashboard.
   - Stewards can turn AI on/off at any time.
   - The card will clearly state what changes for members:
     - AI on: optional photo-based draft descriptions and optional illustration tools are available.
     - AI off: members add photos and descriptions manually; AI drafting and illustration buttons are hidden.

6. **Respect the setting everywhere AI appears**
   - `AddSupply`: hide AI draft path when off; always support photo upload without AI.
   - `BulkAddSupplies`: when off, turn selected photos into manual review drafts instead of analyzing them.
   - `GenerateIllustrationButton`, item detail modal, My Supplies, and steward batch illustration tools: hide or disable illustration generation when AI is off.
   - Community context will load the AI setting once so components can consistently use it.

## Technical implementation

1. **Database migration**
   - Add `ai_features_enabled boolean not null default true` to `public.communities`.
   - No new table is needed.
   - No role storage changes are needed.

2. **Community context**
   - Extend `CommunityContext` to include `aiFeaturesEnabled`.
   - Query `ai_features_enabled` when resolving communities.
   - Default to `true` for safety/backward compatibility.

3. **Add Item flow refactor**
   - Split current `handleImageUpload` into:
     - upload/compress photo helper
     - manual-photo path
     - optional AI-photo path
   - After upload, use the Storage public URL for the preview instead of keeping a blob preview alive longer than needed.
   - Revoke object URLs and release canvas memory promptly.
   - Adjust copy so manual photo upload never mentions AI.

4. **Bulk Add flow refactor**
   - Add a manual review path that uploads each selected photo and creates editable blank drafts.
   - Keep AI analysis as an optional button only when `aiFeaturesEnabled` is true.

5. **Steward controls**
   - Create a reusable `CommunityAiSettings` component.
   - Use it in both steward dashboard variants so `/c/:slug?tab=steward` and `/c/:slug/steward` are covered.

6. **Create Community edge function and form**
   - Add `aiFeaturesEnabled` to the validated request body.
   - Insert it into the new community row.
   - Add the onboarding toggle UI to `StartCommunityForm` before account creation.

## Validation

- Confirm Karen’s safe path: add photo, skip AI, fill details, publish.
- Confirm AI-on path still works but remains optional.
- Confirm AI-off hides draft and illustration controls.
- Confirm steward toggle updates only the current steward’s community.
- Confirm existing communities default to AI enabled.