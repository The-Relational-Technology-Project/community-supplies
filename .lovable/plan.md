

## Fix: Community Sign-Up Flow is Broken for Non-Flagship Communities

### Bugs Found

**Bug 1: New members always join the flagship community, not the one they visited**

In `LandingPage.tsx` (line 253-258), the `AuthModal` is rendered **without** passing `communityId` or `communityName` props:

```tsx
<AuthModal
  isOpen={!!modalMode}
  mode={modalMode}
  onClose={() => setModalMode(null)}
  onSuccess={() => onTabChange('browse')}
/>
```

Inside `AuthModal.handleSignup` (line 96-102), `communityId` from props is checked — since it's undefined, it's never included in the signup metadata. The `handle_new_user` database trigger then defaults to the flagship community UUID. **Every user who signs up via `/c/some-slug` gets assigned to the wrong community.**

**Bug 2: Approval-required communities have no proper join flow from the landing page**

The "Join [Community]" button on the community-specific landing page opens the `AuthModal` in `signup` mode, which creates an account directly. For communities with `join_mode = 'approval_required'`, this means:
- The user account gets created with `vouched_at = null` (correct)
- But **no join request record** is created for the steward to review
- The steward has no way to know someone is waiting for approval

The `JoinRequestForm` (which does create both an account AND a join request) only appears inside `AuthGuard` — a screen users would never reach from the landing page.

### Fix

**File: `src/components/LandingPage.tsx`**

1. Pass `communityId` and `communityName` from the community context to `AuthModal`:
```tsx
<AuthModal
  isOpen={!!modalMode}
  mode={modalMode}
  onClose={() => setModalMode(null)}
  onSuccess={() => onTabChange('browse')}
  communityId={isCommunitySpecific ? communityId : undefined}
  communityName={isCommunitySpecific ? communityName : undefined}
/>
```

2. For communities with `join_mode = 'approval_required'`, the "Join" button should show the `JoinRequestForm` instead of the signup modal. Add state to track join mode and fetch it from the `communities` table. When `join_mode` is `approval_required`, render `JoinRequestForm` inline (or in a dialog) instead of opening the AuthModal in signup mode.

3. Import `communityId` from `useCommunity()` (it's already imported but only `communityName` and `communitySlug` are destructured).

**File: `src/components/LandingPage.tsx` — detailed changes**

- Destructure `communityId` from `useCommunity()`
- Add state: `joinMode` (fetched from communities table) and `showJoinForm`
- Add `useEffect` to fetch `join_mode` when `isCommunitySpecific`
- For the "Join" CTA button: if `joinMode === 'approval_required'`, toggle `showJoinForm` state instead of opening AuthModal
- Render `JoinRequestForm` in a dialog or inline section when `showJoinForm` is true
- Pass `communityId` to `AuthModal` for auto-join communities

### Result

- Auto-join communities: neighbor clicks "Join", creates account with correct `community_id`, gets immediate access
- Approval-required communities: neighbor clicks "Join", sees the `JoinRequestForm` which creates both an auth account and a join request for steward review
- Sign In works for both — existing members log in normally

