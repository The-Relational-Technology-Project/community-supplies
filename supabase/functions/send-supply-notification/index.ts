import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const SupplyNotificationSchema = z.object({
  itemName: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(100),
  ownerEmail: z.string().trim().email().max(255),
  description: z.string().trim().min(1).max(2000),
  neighborhood: z.string().trim().max(200).optional(),
});

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

    const { itemName, category, ownerName, ownerEmail, description, neighborhood } = validationResult.data;

    const safeItemName = escapeHtml(itemName);
    const safeCategory = escapeHtml(category);
    const safeOwnerName = escapeHtml(ownerName);
    const safeOwnerEmail = escapeHtml(ownerEmail);
    const safeDescription = escapeHtml(description);
    const safeNeighborhood = neighborhood ? escapeHtml(neighborhood) : null;

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: ["josh@relationaltechproject.org"],
      subject: `New Supply Added: ${safeItemName}`,
      html: `
        <h2>New Supply Item</h2>
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
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);