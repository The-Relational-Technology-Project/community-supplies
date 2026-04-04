import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user is vouched
    const { data: vouchedData } = await supabase.rpc("is_user_vouched", { user_id: userId });
    if (!vouchedData) {
      return new Response(JSON.stringify({ error: "Not a vouched member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get enabled neighbors
    const { data: neighbors, error: neighborsError } = await supabase
      .from("community_neighbors")
      .select("*")
      .eq("enabled", true);

    if (neighborsError || !neighbors?.length) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fan out to each neighbor with 3-second timeout
    const results = await Promise.allSettled(
      neighbors.map(async (neighbor) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          const res = await fetch(neighbor.search_endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: query.trim(),
              federation_key: neighbor.federation_key,
            }),
            signal: controller.signal,
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            communityName: data.community_name || neighbor.name,
            joinUrl: neighbor.join_url,
            categories: data.results || [],
          };
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    const successfulResults = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .filter((r) => r.categories.length > 0);

    return new Response(JSON.stringify(successfulResults), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
