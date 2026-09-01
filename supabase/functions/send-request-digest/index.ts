import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { escapeHtml, emailShell, ctaButton, requestCardHtml, sendInBatches } from "../_shared/requestEmail.ts";
import { makeUnsubscribeToken, unsubscribeUrl } from "../_shared/unsubscribeToken.ts";

/**
 * Weekly digest of still-open Request Board posts, for communities whose
 * steward chose "weekly". Invoked by a scheduled job with the cron secret.
 * Communities with no open requests from the past week are skipped entirely.
 */

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: communities } = await supabase
      .from("communities")
      .select("id, name, slug")
      .eq("request_notify_mode", "weekly");

    const summary: Record<string, number> = {};

    for (const community of communities ?? []) {
      const { data: requests } = await supabase
        .from("item_requests")
        .select("title, note, category, created_at")
        .eq("community_id", community.id)
        .eq("status", "open")
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (!requests || requests.length === 0) continue; // quiet week stays quiet

      const { data: members } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("community_id", community.id)
        .eq("membership_status", "active")
        .eq("request_emails_opt_out", false);

      const recipients = (members ?? []).filter((m) => !!m.email);
      if (recipients.length === 0) continue;

      const boardUrl = `https://communitysupplies.org/c/${community.slug}?tab=requests`;
      const safeCommunity = escapeHtml(community.name);
      const cards = requests.map((r) => requestCardHtml(r.title, r.note, r.category)).join("");
      const count = requests.length;

      const { sent } = await sendInBatches(recipients, 20, async (member) => {
        const unsubLink = unsubscribeUrl(projectUrl, member.id, await makeUnsubscribeToken(member.id));
        const body = `
          <h2 style="color: #c17c4a; margin-bottom: 24px;">This week's requests in ${safeCommunity}</h2>
          <p style="color: #6b5a4a; line-height: 1.6;">
            ${count === 1 ? "A neighbor is" : `${count} neighbors are`} looking for something.
            If you have one to lend, add it from the Request Board and they'll be notified.
          </p>
          ${cards}
          ${ctaButton(boardUrl, "Open the Request Board")}
        `;
        const footer = `
          Sent weekly by Community Supplies because you're a member of ${safeCommunity}.
          <a href="${unsubLink}" style="color: #8b7355;">Turn these emails off for me</a>.
        `;
        return await resend.emails.send({
          from: "Community Supplies <notifications@communitysupplies.org>",
          to: [member.email as string],
          subject: `${count} open request${count === 1 ? "" : "s"} in ${community.name}`,
          html: emailShell(body, footer),
        });
      });

      summary[community.slug] = sent;
    }

    return json({ ok: true, summary });
  } catch (error: any) {
    console.error("Error in send-request-digest:", error);
    return json({ error: error.message }, 500);
  }
});
