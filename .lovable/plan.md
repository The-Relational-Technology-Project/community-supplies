

## Replace Community Directory with Static Ticker

Swap the "Active Communities" section in `LandingPage.tsx` for a simple, animated horizontal ticker showing community names. Remove the Supabase `communities` fetch since it's no longer needed.

### Changes

**`src/components/LandingPage.tsx`**:
- Remove `communities` / `loadingCommunities` state and the `fetchCommunities` call
- Replace the "Active Communities" section with a horizontally scrolling ticker containing: `Outer Sunset, SF · Chevy Chase, MD · Mission District, SF · Baldwin Acres, VA · Cedars of Carrboro, NC · South Central Austin, TX · and spreading!`
- Use a CSS marquee-style animation (keyframes in a `<style>` tag or Tailwind arbitrary animation) so the text scrolls continuously left
- Keep the "Start a Sharing Community" dashed-border CTA below it

One file changed, no database or edge function changes.

