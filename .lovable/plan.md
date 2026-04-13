

## Fix: Render-Loop Crash Killing Supabase

### Root cause

**`src/hooks/useSupplies.ts` lines 52-58** call `toast()` directly during render — not inside a `useEffect`. When the RPC returns an error:

1. Component renders → sees `error` → calls `toast()` → dispatches state update
2. State update triggers re-render → sees `error` again → calls `toast()` again
3. Infinite loop → React error #301 → app crashes to blank tan screen
4. User refreshes → more RPC calls pile up → database overwhelmed → **statement timeouts** → Supabase goes "Unhealthy"

This is the exact pattern shown in the console screenshot: multiple 500s from `get_supplies_with_owners`, then React error #301.

### Fix

**`src/hooks/useSupplies.ts`** — Move the error toast into a `useEffect` so it only fires once when the error changes, not on every render:

```typescript
import { useEffect } from "react";

// Replace the bare if(error) block with:
useEffect(() => {
  if (error) {
    toast({
      title: "Error loading supplies",
      description: error instanceof Error ? error.message : "Failed to load supplies",
      variant: "destructive"
    });
  }
}, [error, toast]);
```

**`src/main.tsx`** — Bump the cache buster from `'v2'` to `'v3'` so any corrupted caches from the crash loop are discarded automatically.

### Files to modify
- `src/hooks/useSupplies.ts` — wrap toast in useEffect
- `src/main.tsx` — bump buster to `'v3'`

