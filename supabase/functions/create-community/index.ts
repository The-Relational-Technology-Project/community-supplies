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

function escapeHtml(text: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (c) => entities[c] || c);
}

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

    // 7. Send welcome email (non-blocking)
    const APP_URL = "https://sunset-block-party-supplies.lovable.app";
    const communityUrl = `${APP_URL}/c/${communitySlug}`;
    const stewardUrl = `${APP_URL}/c/${communitySlug}/steward`;

    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Community Supplies <josh@relationaltechproject.org>",
          to: [stewardEmail],
          subject: "Your community is live! Here's your link 🎉",
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:580px;margin:0 auto;padding:40px 20px;">
  <div style="background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size:24px;font-weight:bold;color:#1a1a1a;margin:0 0 16px;">Welcome, ${escapeHtml(stewardName)}! 🎉</h1>
    <p style="font-size:16px;color:#4a4a4a;line-height:1.6;margin:0 0 8px;">
      Your community <strong>${escapeHtml(communityName)}</strong> is live and ready for neighbors to join.
    </p>
    <p style="font-size:16px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;">
      Bookmark this link — it's your community's home:
    </p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${communityUrl}" style="display:inline-block;background:#e97451;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
        Go to ${escapeHtml(communityName)}
      </a>
    </div>
    <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 12px;">Quick next steps:</h2>
    <ol style="font-size:15px;color:#4a4a4a;line-height:1.8;margin:0 0 24px;padding-left:20px;">
      <li><strong>Add your first supplies</strong> — list items you're willing to share with neighbors.</li>
      <li><strong>Invite neighbors</strong> — share your community link: <a href="${communityUrl}" style="color:#e97451;">${communityUrl}</a></li>
      <li><strong>Manage your community</strong> — use the <a href="${stewardUrl}" style="color:#e97451;">steward dashboard</a> to review members and requests.</li>
    </ol>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="font-size:14px;color:#888;line-height:1.5;margin:0;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@relationaltechproject.org" style="color:#e97451;">hello@relationaltechproject.org</a>.
    </p>
    <p style="font-size:14px;color:#888;margin:16px 0 0;">— Josh, Community Supplies</p>
  </div>
</div>
</body>
</html>`,
        });
      }
    } catch (emailErr) {
      console.error("Welcome email failed (non-blocking):", emailErr);
    }

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
