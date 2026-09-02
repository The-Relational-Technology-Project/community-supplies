const serve = Deno.serve;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const contentType = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let ext = contentType.split("/")[1]?.split("+")[0] || "bin";
  if (ext === "jpeg") ext = "jpg";
  return { bytes, contentType, ext };
}

async function uploadIfDataUrl(
  supabase: ReturnType<typeof createClient>,
  value: string | null | undefined,
  ownerId: string,
  field: string,
  supplyId: string,
  idx = 0,
): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith("data:")) return value; // already a URL — leave alone
  const decoded = dataUrlToBytes(value);
  if (!decoded) {
    console.warn(`Could not decode data URL for supply ${supplyId} field ${field}`);
    return value;
  }
  const path = `${ownerId}/migrated/${supplyId}-${field}-${idx}-${crypto.randomUUID()}.${decoded.ext}`;
  const { error } = await supabase.storage.from("supply-images").upload(path, decoded.bytes, {
    contentType: decoded.contentType,
    upsert: false,
  });
  if (error) {
    console.error(`Upload failed for supply ${supplyId} field ${field}:`, error.message);
    return value;
  }
  return supabase.storage.from("supply-images").getPublicUrl(path).data.publicUrl;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Allow two auth modes:
    //  (a) steward JWT — for invocation from the app UI
    //  (b) shared FEDERATION_SECRET — for agent/CLI invocation during migration
    const sharedSecret = req.headers.get("x-migration-secret");
    const federationSecret = Deno.env.get("FEDERATION_SECRET");
    let authorized = false;
    let authDebug = "";

    if (sharedSecret && federationSecret && sharedSecret === federationSecret) {
      authorized = true;
      authDebug = "secret-match";
    } else {
      authDebug = `secret-mismatch (recv_len=${sharedSecret?.length ?? 0}, env_len=${federationSecret?.length ?? 0})`;
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!authError && user) {
          const { data: isSteward } = await supabase.rpc("is_user_steward", { user_id: user.id });
          if (isSteward) { authorized = true; authDebug = "steward-jwt"; }
          else authDebug = "not-steward";
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized", authDebug }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { limit?: number; dryRun?: boolean } = {};
    try { body = await req.json(); } catch (_) { /* no body OK */ }
    const limit = Math.min(Math.max(body.limit ?? 25, 1), 50);
    const dryRun = !!body.dryRun;

    // Find supplies that still have any base64 data URLs to migrate.
    const { data: supplies, error: fetchErr } = await supabase
      .from("supplies")
      .select("id, owner_id, image_url, illustration_url, images")
      .or("image_url.like.data:%,illustration_url.like.data:%")
      .limit(limit);

    if (fetchErr) throw fetchErr;

    // Also include rows where any images[] entry is base64 (Postgrest can't filter array-contains LIKE).
    const { data: extraSupplies } = await supabase
      .from("supplies")
      .select("id, owner_id, image_url, illustration_url, images")
      .not("images", "is", null)
      .limit(200);
    const seen = new Set((supplies || []).map((s: any) => s.id));
    const arrayB64 = (extraSupplies || []).filter((s: any) =>
      !seen.has(s.id) && Array.isArray(s.images) && s.images.some((u: string) => typeof u === "string" && u.startsWith("data:"))
    ).slice(0, Math.max(0, limit - (supplies?.length ?? 0)));

    const work = [...(supplies || []), ...arrayB64];
    const summary = { scanned: work.length, updated: 0, errors: 0, dryRun };
    const details: any[] = [];

    for (const s of work as any[]) {
      try {
        const owner = s.owner_id || "unknown";
        const newImageUrl = await uploadIfDataUrl(supabase, s.image_url, owner, "image_url", s.id, 0);
        const newIllustration = await uploadIfDataUrl(supabase, s.illustration_url, owner, "illustration", s.id, 0);
        let newImages: string[] = s.images || [];
        if (Array.isArray(s.images)) {
          newImages = [];
          for (let i = 0; i < s.images.length; i++) {
            const u = s.images[i];
            const replaced = await uploadIfDataUrl(supabase, u, owner, "images", s.id, i);
            if (replaced) newImages.push(replaced);
          }
        }

        const patch: Record<string, any> = {};
        if (newImageUrl !== s.image_url) patch.image_url = newImageUrl;
        if (newIllustration !== s.illustration_url) patch.illustration_url = newIllustration;
        if (JSON.stringify(newImages) !== JSON.stringify(s.images)) patch.images = newImages;

        if (Object.keys(patch).length === 0) {
          details.push({ id: s.id, changed: false });
          continue;
        }

        if (!dryRun) {
          const { error: upErr } = await supabase.from("supplies").update(patch).eq("id", s.id);
          if (upErr) throw upErr;
        }
        summary.updated++;
        details.push({ id: s.id, fields: Object.keys(patch), dryRun });
      } catch (e: any) {
        summary.errors++;
        details.push({ id: s.id, error: e?.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ summary, details }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("migrate-base64-to-storage error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
