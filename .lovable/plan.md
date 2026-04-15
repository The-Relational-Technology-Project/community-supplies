

## Fix: Make Landing Page Community-Aware with Clear Sign In

### Problem

When a steward (or any member) visits their community URL (`/c/slug`) while logged out, they see a generic landing page hardcoded to "Sunset & Richmond Community" with no visible "Sign In" button. This blocks returning users from accessing their community.

### Root Cause

`LandingPage.tsx` doesn't use `useCommunity()` context. It hardcodes the flagship community name and only offers a "Join Sunset & Richmond Community" button (which confusingly opens the login modal).

### Changes

**File: `src/components/LandingPage.tsx`**

1. Import and use `useCommunity()` to get `communityName`, `communitySlug`, `communityId`
2. Detect whether we're on a non-default community (`communitySlug !== 'sunset-richmond'`)
3. For community-specific landing pages (`/c/slug`):
   - Show the community name in the hero heading instead of generic "Community Supplies"
   - Replace "Join Sunset & Richmond Community" with **"Sign In"** as a clear primary CTA
   - Add a secondary **"Request to Join"** or **"Create Account"** button for new members
   - Hide the "Start a Sharing Community" CTA (irrelevant when visiting a specific community)
   - Hide the community ticker and "start your own" section
4. For the root landing page (`/`):
   - Keep existing behavior (generic branding, flagship CTA)
   - Add a visible "Already a member? Sign In" link so returning users of any community can log in

**File: `src/components/auth/AuthModal.tsx`**

- No changes needed — it already supports `login`, `signup`, and `join-request` modes

### What the community-specific landing page will show

```text
┌─────────────────────────────────────────┐
│                                         │
│        [Community Name]                 │
│   Borrow what you need.                 │
│   Share what you have.                  │
│                                         │
│   ┌──────────┐  ┌──────────────────┐    │
│   │ Sign In  │  │ Join Community   │    │
│   └──────────┘  └──────────────────┘    │
│                                         │
│        Illustration gallery             │
│                                         │
│              Footer                     │
└─────────────────────────────────────────┘
```

### What the root landing page will add

A "Already a member? Sign in" text link below the existing CTAs, opening the login modal.

### Technical Detail

The `LandingPage` receives `onTabChange` but doesn't receive community info. We'll add `useCommunity()` inside the component (it's already wrapped in `CommunityProvider` via `Index`). The community-aware check is simply:

```typescript
const { communityName, communitySlug } = useCommunity();
const isCommunitySpecific = communitySlug !== 'sunset-richmond';
```

