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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
});

const BulkNotificationSchema = z.object({
  items: z.array(ItemSchema).min(1).max(10),
  ownerName: z.string().min(1).max(100),
  ownerEmail: z.string().email().max(255),
  neighborhood: z.string().max(200).optional(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const parsed = BulkNotificationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, ownerName, ownerEmail, neighborhood } = parsed.data;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);

    const safeOwner = escapeHtml(ownerName);
    const safeEmail = escapeHtml(ownerEmail);
    const safeNeighborhood = neighborhood ? escapeHtml(neighborhood) : null;

    const itemsHtml = items.map(item =>
      `<li><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(item.category)})</li>`
    ).join('\n');

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: ["josh@relationaltechproject.org"],
      subject: `${items.length} New Items Added by ${safeOwner}`,
      html: `
        <h2>Bulk Items Added</h2>
        <p><strong>${safeOwner}</strong> (${safeEmail}) added ${items.length} item${items.length > 1 ? 's' : ''}:</p>
        ${safeNeighborhood ? `<p><strong>Neighborhood:</strong> ${safeNeighborhood}</p>` : ''}
        <ul>${itemsHtml}</ul>
        <hr>
        <p>View the <a href="https://sunset-block-party-supplies.lovable.app">catalog</a>.</p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-bulk-supply-notification:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});