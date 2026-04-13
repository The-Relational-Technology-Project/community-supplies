

## Faster Library Loading: Lazy Images + Pagination

### Problem
All supply cards (and their illustration images) render at once, causing a slow initial load — especially on mobile. The data itself loads via RPC, but then every `<img>` fires immediately.

### Solution — 3 changes

**1. Lazy-load images with `loading="lazy"`**
Add `loading="lazy"` to the `<img>` tag in `SupplyCard.tsx`. The browser natively defers off-screen images, loading them as the user scrolls. Zero dependencies, works on all modern browsers.

**2. Show item name immediately while image loads**
Restructure `SupplyCard` so the text (name + location) renders beneath the image area regardless of image load state. The image area shows the name as a text placeholder until the image finishes loading — use an `onLoad` state flag to crossfade from text placeholder to loaded image.

**3. Paginate results (25 per page)**
Add pagination state to `BrowseSupplies.tsx`:
- `currentPage` state, default 1, resets when filters/search change
- Slice `filteredSupplies` to show items `(page-1)*25` through `page*25`
- Render a simple "Previous / Page X of Y / Next" control below the grid using the existing `Pagination` UI components
- Scroll to top of results on page change

### Files to modify
- `src/components/SupplyCard.tsx` — add `loading="lazy"`, add image load state for text-first rendering
- `src/components/BrowseSupplies.tsx` — add pagination logic and controls

### Technical notes
- `loading="lazy"` is a single attribute addition — the browser handles intersection detection
- Pagination is client-side (all data is already fetched and cached). This keeps the cache working and avoids API changes. 25 items means ~25 images max in the DOM at once.
- Page resets to 1 on any filter/search change via a `useEffect`

