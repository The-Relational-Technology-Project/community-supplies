import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const SupplyNotificationSchema = z.object({
  communityId: z.string().uuid(),
  itemName: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(100),
  ownerEmail: z.string().trim().email().max(255),
  description: z.string().trim().min(1).max(2000),
  neighborhood: z.string().trim().max(200).optional(),
});

async function getStewardEmailsAndCommunityName(communityId: string): Promise<{ emails: string[]; communityName: string }> {
  const { data: community } = await supabaseAdmin
    .from("communities")
    .select("name")
    .eq("id", communityId)
    .single();

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("role", "steward");

  const userIds = (roles ?? []).map((r: any) => r.user_id);
  if (userIds.length === 0) return { emails: [], communityName: community?.name ?? "Unknown" };

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .in("id", userIds);

  const emails = Array.from(
    new Set((profiles ?? []).map((p: any) => p.email).filter((e: string | null) => !!e))
  );
  return { emails, communityName: community?.name ?? "Unknown" };
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validationResult = SupplyNotificationSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input data",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { communityId, itemName, category, ownerName, ownerEmail, description, neighborhood } = validationResult.data;

    const { emails: stewardEmails, communityName } = await getStewardEmailsAndCommunityName(communityId);

    if (stewardEmails.length === 0) {
      console.warn(`No stewards found for community ${communityId}; skipping supply notification.`);
      return new Response(JSON.stringify({ skipped: true, reason: "no_stewards" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeItemName = escapeHtml(itemName);
    const safeCategory = escapeHtml(category);
    const safeOwnerName = escapeHtml(ownerName);
    const safeOwnerEmail = escapeHtml(ownerEmail);
    const safeDescription = escapeHtml(description);
    const safeNeighborhood = neighborhood ? escapeHtml(neighborhood) : null;
    const safeCommunityName = escapeHtml(communityName);

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: stewardEmails,
      subject: `New Supply in ${safeCommunityName}: ${safeItemName}`,
      html: `
        <h2>New Supply Item in ${safeCommunityName}</h2>
        <p><strong>Item:</strong> ${safeItemName}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>Description:</strong> ${safeDescription}</p>
        ${safeNeighborhood ? `<p><strong>Neighborhood:</strong> ${safeNeighborhood}</p>` : ''}
        <hr>
        <p><strong>Owner:</strong> ${safeOwnerName}</p>
        <p><strong>Email:</strong> ${safeOwnerEmail}</p>
        <p>View the <a href="https://communitysupplies.org">catalog</a> to see all supplies.</p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-supply-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
