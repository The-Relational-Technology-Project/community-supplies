import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { escapeHtml, emailShell, ctaButton, requestCardHtml, sendInBatches } from "../_shared/requestEmail.ts";
import { makeUnsubscribeToken, unsubscribeUrl } from "../_shared/unsubscribeToken.ts";

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

const BodySchema = z.object({ requestId: z.string().uuid() });

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request } = await supabase
      .from("item_requests")
      .select("id, title, note, category, status, requester_id, community_id")
      .eq("id", parsed.data.requestId)
      .maybeSingle();

    if (!request) return json({ error: "Request not found" }, 404);
    // Only the person who posted the request can trigger its announcement.
    if (request.requester_id !== userId) return json({ error: "Not your request" }, 403);
    if (request.status !== "open") return json({ skipped: "request not open" });

    const { data: community } = await supabase
      .from("communities")
      .select("name, slug, request_notify_mode")
      .eq("id", request.community_id)
      .maybeSingle();

    if (!community) return json({ error: "Community not found" }, 404);
    if (community.request_notify_mode !== "each") {
      return json({ skipped: `notify mode is ${community.request_notify_mode}` });
    }

    const { data: requester } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", request.requester_id)
      .maybeSingle();

    const { data: members } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("community_id", request.community_id)
      .eq("membership_status", "active")
      .eq("request_emails_opt_out", false)
      .neq("id", request.requester_id);

    const recipients = (members ?? []).filter((m) => !!m.email);
    if (recipients.length === 0) return json({ sent: 0 });

    const boardUrl = `https://communitysupplies.org/c/${community.slug}?tab=requests`;
    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const askerFirstName = escapeHtml((requester?.name || "A neighbor").split(" ")[0]);
    const safeCommunity = escapeHtml(community.name);

    const { sent, failed } = await sendInBatches(recipients, 20, async (member) => {
      const unsubToken = await makeUnsubscribeToken(member.id);
      const unsubLink = unsubscribeUrl(projectUrl, member.id, unsubToken);
      const body = `
        <h2 style="color: #c17c4a; margin-bottom: 24px;">${askerFirstName} is looking for something</h2>
        <p style="color: #6b5a4a; line-height: 1.6;">
          A neighbor in ${safeCommunity} posted a new request. If you have one to lend, you can add it
          right from the Request Board and they'll be notified.
        </p>
        ${requestCardHtml(request.title, request.note, request.category)}
        ${ctaButton(boardUrl, "Open the Request Board")}
      `;
      const footer = `
        Sent by Community Supplies because you're a member of ${safeCommunity}.
        <a href="${unsubLink}" style="color: #8b7355;">Turn these emails off for me</a>.
      `;
      return await resend.emails.send({
        from: "Community Supplies <notifications@communitysupplies.org>",
        to: [member.email as string],
        subject: `New request in ${community.name}: ${request.title}`,
        html: emailShell(body, footer),
      });
    });

    return json({ sent, failed });
  } catch (error: any) {
    console.error("Error in send-request-posted:", error);
    return json({ error: error.message }, 500);
  }
};

serve(handler);
