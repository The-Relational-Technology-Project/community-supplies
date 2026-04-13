

## Landing Page Polish for Launch

### Overview
Prepare the landing page for high-traffic visibility: add a hand-drawn SVG illustration of the Sunset/Richmond coastline as a hero background, update the primary CTA copy, and make a few subtle refinements.

### 1. Hero background illustration

Create an inline SVG component (`src/components/SunsetSkyline.tsx`) — a minimalist, hand-drawn line illustration of the Sunset/Richmond aerial view: the coastline running diagonally, the grid of neighborhood blocks, ocean waves, and the hint of the Marin headlands. Style: thin terracotta/deep-brown strokes on transparent background, matching the catalog illustration aesthetic (line art, no fills, slightly wobbly lines for a hand-drawn feel).

Place it behind the hero text in `LandingPage.tsx` as a decorative background element — `absolute`, `opacity-[0.12]` or similar so it adds texture without competing with the text. On mobile it scales down gracefully.

### 2. CTA copy update

Change the primary CTA from **"Browse Sunset & Richmond"** to **"Join Sunset & Richmond Community"** in both the hero button (logged-in and logged-out variants) and the Active Communities card button. For logged-out users the button still opens the auth modal; for logged-in users it navigates to browse.

### 3. Meta tags refresh

Update `index.html` meta description from "A neighborhood supply library for the Outer Sunset" to something broader: "A free tool for neighborhoods to share supplies, tools, and more. Borrow what you need, share what you have." — better for the incoming audience who won't know what the Outer Sunset is.

### 4. OG image check

Verify `public/og-image.png` exists and is suitable for social sharing from the WaPo article link. If it needs updating, flag it (we can generate one separately).

### Files to create
- `src/components/SunsetSkyline.tsx` — SVG illustration component

### Files to modify
- `src/components/LandingPage.tsx` — add background illustration, update CTA text
- `index.html` — update meta description and OG description

### Technical details
- The SVG is a React component with inline paths, not an external file — keeps it fast and avoids an extra network request
- Uses `currentColor` or theme colors so it works with the existing palette
- Positioned with `absolute inset-0` inside the hero section, behind the text via `z-0`
- The illustration traces the key features from the uploaded aerial photo: diagonal coastline with wave lines, rectangular street grid, Golden Gate Park edge, headlands silhouette

