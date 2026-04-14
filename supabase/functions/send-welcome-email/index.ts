import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const WelcomeEmailSchema = z.object({
  memberName: z.string().trim().min(1).max(100),
  memberEmail: z.string().trim().email().max(255),
  communityName: z.string().trim().min(1).max(200),
  communitySlug: z.string().trim().min(1).max(100),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const rawBody = await req.json();
    const parsed = WelcomeEmailSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { memberName, memberEmail, communityName, communitySlug } = parsed.data;
    const safeName = escapeHtml(memberName);
    const safeCommunityName = escapeHtml(communityName);
    const communityUrl = `https://communitysupplies.org/c/${encodeURIComponent(communitySlug)}`;

    console.log("Sending welcome email to:", memberEmail, "for community:", communityName);

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: [memberEmail],
      subject: `Welcome to ${safeCommunityName} on Community Supplies!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #E8590C;">Welcome to ${safeCommunityName}! 🎉</h2>
          <p>Hi ${safeName},</p>
          <p>You're now a member of <strong>${safeCommunityName}</strong> on Community Supplies. 
          Your neighbors are sharing all kinds of useful things — from party supplies to kitchen gear to tools and more.</p>
          <p style="margin: 30px 0;">
            <a href="${communityUrl}" 
               style="background-color: #E8590C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Browse Your Community's Catalog
            </a>
          </p>
          <p>Here are a few things you can do:</p>
          <ul>
            <li>🔍 <strong>Browse</strong> what your neighbors are sharing</li>
            <li>📦 <strong>Add your own items</strong> to share with the community</li>
            <li>📨 <strong>Request to borrow</strong> something you need</li>
          </ul>
          <p>Happy sharing!</p>
          <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px;">
            Community Supplies — Neighbors sharing with neighbors<br>
            Questions? Reach out to <a href="mailto:hello@relationaltechproject.org">hello@relationaltechproject.org</a>
          </p>
        </div>
      `,
    });

    console.log("Welcome email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
