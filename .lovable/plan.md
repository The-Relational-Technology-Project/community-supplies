
Good catch. The current "Community Care" section says "reach out to us" for conflicts, but in a multi-tenant model the steward of each community is the right first point of contact for sharing-related issues. The Relational Tech team should only be the contact for site/platform questions.

## Change

Edit `src/pages/PrivacyTerms.tsx` — rewrite the Community Care section to route people correctly:

**New copy structure:**

1. Opening paragraph stays warm but clarifies the two-tier support model:
   > "We know things don't always go perfectly. Each sharing community on Community Supplies is cared for by a local steward — a neighbor who helps welcome new members and keep things running smoothly. If a misunderstanding, conflict, or problem comes up between neighbors, your community steward is the best first point of contact."

2. Second paragraph on damaged/lost items:
   > "If an item gets damaged, lost, or a sharing arrangement goes sideways, talk to your neighbor first — most things resolve with a direct conversation. If you need help facilitating that conversation, reach out to your community steward. They can't resolve it for you, but they can help you find a path forward together."

3. Keep the bulleted norms (honest about condition, clear communication, treat items well, talk to neighbor first).

4. Replace the final "If you need help, reach out to us" bullet with a clearer split:
   - "For questions or help with your sharing community, contact your community steward."
   - "For questions about the site itself (bugs, account issues, privacy), email hello@relationaltechproject.org."

## Also update the "Questions?" section

Currently it implies "us" handles everything. Tighten it to clarify the same split:
- Steward = community-level questions
- hello@relationaltechproject.org = platform/site-level questions

## Out of scope
- Adding a UI surface that shows each community's steward contact info (worth considering separately — right now stewards' emails aren't necessarily exposed in-app, so the policy will say "contact your community steward" generically). If you want, we can follow up with a small "Your community steward" card on the community home page that shows the steward's name and a contact button.

## Files to change
- `src/pages/PrivacyTerms.tsx` — rewrite Community Care section and tweak Questions section.
