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
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const CoStewardSchema = z.object({
  name: z.string().trim().max(100),
  email: z.string().trim().email().max(255),
});

const RequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  coStewards: z.array(CoStewardSchema).max(10).default([]),
  reason: z.string().trim().min(1).max(2000),
  questions: z.string().trim().max(2000).nullable().optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const result = RequestSchema.safeParse(rawBody);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: result.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, coStewards, reason, questions } = result.data;

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeReason = escapeHtml(reason);
    const safeQuestions = questions ? escapeHtml(questions) : null;

    const coStewardHtml = coStewards.length > 0
      ? `<p><strong>Co-stewards:</strong></p><ul>${coStewards.map(
          (cs) => `<li>${escapeHtml(cs.name)} — ${escapeHtml(cs.email)}</li>`
        ).join("")}</ul>`
      : "";

    const emailResponse = await resend.emails.send({
      from: "Community Supplies <notifications@communitysupplies.org>",
      to: ["josh@relationaltechproject.org"],
      subject: `New Community Request from ${name}`,
      html: `
        <h2>New Community Steward Request</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${coStewardHtml}
        <p><strong>Why they want to start a community:</strong></p>
        <p>${safeReason}</p>
        ${safeQuestions ? `<p><strong>Questions:</strong></p><p>${safeQuestions}</p>` : ""}
        <p>Check the <a href="https://communitysupplies.org/steward">steward dashboard</a> to review.</p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-community-request-notification:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);