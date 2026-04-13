

## Fix: Corrupted localStorage Cache Crashing the App

### Root Cause

The earlier dual-QueryClient crash (which we fixed) likely wrote malformed data to `localStorage` under the key `community-supplies-cache`. Now every time the app loads in that browser, `PersistQueryClientProvider` tries to deserialize that corrupted cache, React crashes silently, and you see only the tan background.

A clean browser (like the one I just tested with) has no cache, so it loads fine.

### Fix

**`src/main.tsx`** — Two changes:

1. **Add a cache buster** (`buster` option) so the old corrupted cache is automatically invalidated. Set it to a version string like `'v2'`.

2. **Wrap the persister's deserialize in a try/catch** so if localStorage contains garbage, it's silently discarded instead of crashing the app. Use the `deserialize` option on `createSyncStoragePersister`.

```typescript
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'community-supplies-cache',
  deserialize: (cachedString) => {
    try {
      return JSON.parse(cachedString);
    } catch {
      return { clientState: undefined };
    }
  },
});

// In persistOptions, add buster:
persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v2' }}
```

### Immediate workaround

You can also fix your browser right now by opening DevTools > Application > Local Storage and deleting the `community-supplies-cache` key. But the code fix prevents this from ever happening again.

### Published site

Note: the published site still shows "Browse Sunset & Richmond" (old CTA). You'll need to click **Update** in the publish dialog to deploy the latest changes including the CTA update, bulk add feature, and this fix.

### Files to modify
- `src/main.tsx`

