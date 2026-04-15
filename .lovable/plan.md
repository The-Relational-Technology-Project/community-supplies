

## Security Fixes: Email Validation, Community Isolation, and CORS Lockdown

### Three changes

**1. `create-community` -- Prevent email squatting**

Before creating the auth user, check if an account with that email already exists using `supabaseAdmin.auth.admin.listUsers()`. If found, return 409 with a clear error message. This prevents someone from claiming another person's email.

Add after the reserved-slug check (~line 67), before community creation:
```typescript
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
const emailTaken = existingUsers?.users?.some(u => u.email === stewardEmail);
if (emailTaken) {
  return new Response(
    JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**2. `bulk-create-users` -- Community data isolation**

After the steward check, query the steward's `community_id` from their profile. Then:
- Filter `join_requests` by that `community_id`
- Include `community_id` in `user_metadata` when creating auth users
- Include `community_id` when manually creating profiles as fallback

**3. CORS origin allowlist on 15 edge functions**

Replace `"Access-Control-Allow-Origin": "*"` with a dynamic check. Each function gets a helper:

```typescript
const ALLOWED_ORIGINS = [
  "https://communitysupplies.org",
  "https://sunset-block-party-supplies.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
```

**Exception**: `search-public-catalog` keeps `"*"` -- it's a federation endpoint.

### Files modified

- `supabase/functions/create-community/index.ts` -- email-exists check
- `supabase/functions/bulk-create-users/index.ts` -- community_id scoping
- 15 edge functions (all except `search-public-catalog`) -- CORS allowlist

### Deployment

All modified edge functions will be redeployed after changes.

