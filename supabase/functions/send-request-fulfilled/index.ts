const serve = Deno.serve;
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { z } from "npm:zod@3.23.8";

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
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const BodySchema = z.object({
  requestId: z.string().uuid(),
  supplyId: z.string().uuid(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const { requestId, supplyId } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request, error: requestError } = await supabase
      .from("item_requests")
      .select("id, title, status, requester_id, community_id, fulfilled_by, fulfilled_supply_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Only the person who actually fulfilled this request (recorded server-side
    // by the fulfill_item_request RPC) can trigger the notification.
    if (
      request.status !== "fulfilled" ||
      request.fulfilled_by !== userId ||
      request.fulfilled_supply_id !== supplyId
    ) {
      return new Response(JSON.stringify({ error: "Request not fulfilled by you" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const [{ data: supply }, { data: requester }, { data: community }] = await Promise.all([
      supabase.from("supplies").select("name, description").eq("id", supplyId).maybeSingle(),
      supabase.from("profiles").select("name, email").eq("id", request.requester_id).maybeSingle(),
      supabase.from("communities").select("name, slug").eq("id", request.community_id).maybeSingle(),
    ]);

    if (!requester?.email) {
      return new Response(JSON.stringify({ error: "Requester has no email" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const libraryUrl = `https://communitysupplies.org/c/${community?.slug ?? ""}`;
    const safeTitle = escapeHtml(request.title);
    const safeItem = escapeHtml(supply?.name ?? request.title);
    const safeDescription = supply?.description ? escapeHtml(supply.description) : "";
    const safeFirstName = escapeHtml((requester.name || "neighbor").split(" ")[0]);

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: [requester.email],
      subject: `Someone shared "${supply?.name ?? request.title}" for your request`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #4a3728;">
          <h2 style="color: #c17c4a; margin-bottom: 24px;">Good news — a neighbor answered your request!</h2>
          <p style="color: #6b5a4a; line-height: 1.6;">Hi ${safeFirstName},</p>
          <p style="color: #6b5a4a; line-height: 1.6;">
            You asked the community for <strong>${safeTitle}</strong>, and someone in
            ${escapeHtml(community?.name ?? "your community")} just added an item in response.
          </p>
          <div style="background: #f5ebe1; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #c17c4a;">
            <h3 style="margin-top: 0; color: #4a3728; font-size: 18px;">${safeItem}</h3>
            ${safeDescription ? `<p style="line-height: 1.6; color: #6b5a4a; margin: 8px 0;">${safeDescription}</p>` : ""}
          </div>
          <p style="margin: 24px 0;">
            <a href="${libraryUrl}" style="background: #c17c4a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View it in the library
            </a>
          </p>
          <p style="color: #6b5a4a; line-height: 1.6;">
            Open the item in your library and use the contact button to arrange a pickup.
          </p>
          <hr style="border: none; border-top: 1px solid #e5d4c1; margin: 30px 0;">
          <p style="color: #8b7355; font-size: 14px; line-height: 1.5;">
            Sent by Community Supplies because you posted a request on your community's Request Board.
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-request-fulfilled:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }
};

serve(handler);
