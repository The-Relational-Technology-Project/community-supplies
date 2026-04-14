import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  communityName: z.string().min(2).max(200),
  communitySlug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  location: z.string().min(2).max(500),
  reason: z.string().min(2).max(2000),
  questions: z.string().max(2000).optional().nullable(),
  stewardName: z.string().min(1).max(200),
  stewardEmail: z.string().email().max(255),
  stewardPassword: z.string().min(6).max(200),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { communityName, communitySlug, location, reason, questions, stewardName, stewardEmail, stewardPassword } = parsed.data;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check slug uniqueness
    const { data: existing } = await supabaseAdmin
      .from("communities")
      .select("id")
      .eq("slug", communitySlug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This community URL is already taken. Try a different name." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check reserved slugs
    const reserved = ["steward", "profile", "my-supplies", "my-books", "start-community", "privacy", "admin", "api", "c"];
    if (reserved.includes(communitySlug)) {
      return new Response(
        JSON.stringify({ error: "This URL is reserved. Please choose a different name." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create community
    const { data: community, error: communityError } = await supabaseAdmin
      .from("communities")
      .insert({ name: communityName, slug: communitySlug, description: location })
      .select("id")
      .single();

    if (communityError) {
      console.error("Community creation error:", communityError);
      return new Response(
        JSON.stringify({ error: "Failed to create community." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const communityId = community.id;

    // 3. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: stewardEmail,
      password: stewardPassword,
      email_confirm: true,
      user_metadata: {
        name: stewardName,
        community_id: communityId,
      },
    });

    if (authError) {
      // Rollback community
      await supabaseAdmin.from("communities").delete().eq("id", communityId);
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 4. Upsert profile (trigger may have created one, but ensure community_id and role)
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        name: stewardName,
        email: stewardEmail,
        community_id: communityId,
        role: "steward",
      }, { onConflict: "id" });

    // 5. Insert steward role
    await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "steward",
        community_id: communityId,
      }, { onConflict: "user_id,role" });

    // 6. Record in community_steward_requests for audit
    await supabaseAdmin
      .from("community_steward_requests")
      .insert({
        name: stewardName,
        email: stewardEmail,
        reason,
        questions: questions || null,
        status: "approved",
        community_name: communityName,
        community_slug: communitySlug,
        location,
        reviewed_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({ communitySlug, communityId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
