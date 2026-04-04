import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, federation_key } = await req.json();

    // Validate federation key
    const expectedKey = Deno.env.get("FEDERATION_SECRET");
    if (!expectedKey || federation_key !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get community name from site_config
    const { data: configData } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "community_name")
      .single();

    const communityName = configData?.value || "Community Supplies";

    // Search supplies by name/description, group by category, return counts only
    const searchTerm = `%${query.trim()}%`;
    const { data: supplies, error } = await supabase
      .from("supplies")
      .select("category")
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .eq("lent_out", false);

    if (error) {
      console.error("Search error:", error);
      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by category and count
    const categoryCounts: Record<string, number> = {};
    for (const supply of supplies || []) {
      categoryCounts[supply.category] = (categoryCounts[supply.category] || 0) + 1;
    }

    const results = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    return new Response(
      JSON.stringify({ community_name: communityName, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
