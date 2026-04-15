import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
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

const JoinNotificationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  referralSource: z.string().trim().max(500).optional(),
  crossStreets: z.string().trim().max(200).optional(),
  phoneNumber: z.string().trim().max(30).regex(/^[\d\s\-\+\(\)]*$/).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validationResult = JoinNotificationSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, referralSource, crossStreets, phoneNumber } = validationResult.data;

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeReferralSource = referralSource ? escapeHtml(referralSource) : null;
    const safeCrossStreets = crossStreets ? escapeHtml(crossStreets) : null;
    const safePhoneNumber = phoneNumber ? escapeHtml(phoneNumber) : null;

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: ["josh@relationaltechproject.org"],
      subject: "New Join Request - Community Supplies",
      html: `
        <h2>New Join Request</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${safeReferralSource ? `<p><strong>Referral Source:</strong> ${safeReferralSource}</p>` : ''}
        ${safeCrossStreets ? `<p><strong>Cross Streets:</strong> ${safeCrossStreets}</p>` : ''}
        ${safePhoneNumber ? `<p><strong>Phone:</strong> ${safePhoneNumber}</p>` : ''}
        <p>Check the <a href="https://communitysupplies.org/steward">steward dashboard</a> for more details.</p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-join-notification function:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);