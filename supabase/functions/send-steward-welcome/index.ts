import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ALLOWED_ORIGINS = [
  "https://communitysupplies.org",
  "https://sunset-block-party-supplies.lovable.app",
];

const FLAGSHIP_COMMUNITY_SLUG = "sunset-richmond";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const BodySchema = z.object({
  dryRun: z.boolean().optional().default(true),
  sinceDays: z.number().int().min(1).max(60).optional().default(7),
  excludeUserIds: z.array(z.string().uuid()).optional().default([]),
});

function escapeHtml(text: string): string {
  const e: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (c) => e[c] || c);
}

function buildHtml(stewardName: string, communityName: string, communitySlug: string) {
  const safeName = escapeHtml(stewardName || 'there');
  const firstName = safeName.split(' ')[0];
  const safeCommunity = escapeHtml(communityName || 'your community');
  const shareUrl = `https://communitysupplies.org/c/${encodeURIComponent(communitySlug)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d2520; margin: 0; padding: 0; background-color: #f5f1ec; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .content { padding: 36px 32px; }
    p { margin: 0 0 16px 0; font-size: 16px; }
    ol { padding-left: 22px; margin: 18px 0 22px; }
    ol li { margin-bottom: 14px; font-size: 16px; }
    a { color: #c97a54; }
    .footer { padding: 20px 32px 32px; color: #7a6f68; font-size: 13px; text-align: center; }
    .share-link { word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Welcome — and thank you for starting <strong>${safeCommunity}</strong>. It's a real act of care to create a space where neighbors can share with each other.</p>
      <p>You're among the first stewards on Community Supplies, and I wanted to reach out personally to see how it's going and share a few next steps that have helped other communities get off the ground:</p>
      <ol>
        <li><strong>Add 5–10 of your own items first.</strong> A library that already has things in it feels alive and invites others to contribute. Add pictures of simple items (a ladder, a cooler, a folding table) and the site will do the rest.</li>
        <li><strong>Invite 3–5 neighbors or community members you already know.</strong> Your community page has a shareable link: <a class="share-link" href="${shareUrl}">${shareUrl}</a></li>
      </ol>
      <p>If it'd be helpful to talk through your next steps, ideas, or anything you're stuck on, you can grab time on my calendar here: <a href="https://cal.com/joshnesbit">cal.com/joshnesbit</a></p>
      <p>A bit of context on what's behind this: Community Supplies is one of several tools being built by the <a href="https://relationaltechproject.org/">Relational Tech Project</a>, a nonprofit working to support technology that strengthens real-world relationships and neighborhoods. You can also explore the <a href="https://studio.relationaltechproject.org/">Relational Tech Studio</a> to see other tools that can be created and remixed for your community.</p>
      <p>You can reply to this email anytime with ideas, questions, progress updates – I'd love to hear from you.</p>
      <p>Warmly,<br>Josh</p>
    </div>
    <div class="footer">
      Relational Tech Project · hello@relationaltechproject.org
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Caller must be a steward of the flagship community
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('community_id, communities:community_id(slug)')
      .eq('id', user.id)
      .single();

    const callerSlug = (callerProfile as any)?.communities?.slug;
    const { data: isSteward } = await supabase.rpc('is_user_steward', { user_id: user.id });

    if (!isSteward || callerSlug !== FLAGSHIP_COMMUNITY_SLUG) {
      return new Response(JSON.stringify({ error: 'Forbidden: flagship steward only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.errors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { dryRun, sinceDays, excludeUserIds } = parsed.data;

    // Fetch stewards created within window
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, created_at, community_id')
      .eq('role', 'steward')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false });

    if (rolesError) throw new Error(`Failed to fetch stewards: ${rolesError.message}`);

    const userIds = (roles || []).map(r => r.user_id).filter(id => !excludeUserIds.includes(id));
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, dryRun, recipientCount: 0, recipients: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, community_id, communities:community_id(name, slug)')
      .in('id', userIds);

    if (profilesError) throw new Error(`Failed to fetch profiles: ${profilesError.message}`);

    const recipients = (profiles || [])
      .map((p: any) => ({
        userId: p.id,
        name: p.name,
        email: p.email,
        communityName: p.communities?.name || '',
        communitySlug: p.communities?.slug || '',
        stewardSince: roles?.find(r => r.user_id === p.id)?.created_at,
      }))
      .filter(r => r.email && r.communitySlug && r.communitySlug !== FLAGSHIP_COMMUNITY_SLUG);

    if (dryRun) {
      return new Response(JSON.stringify({ success: true, dryRun: true, recipientCount: recipients.length, recipients }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(resendApiKey);

    const emails = recipients.map(r => ({
      from: "Josh Nesbit <hello@relationaltechproject.org>",
      to: [r.email],
      reply_to: "hello@relationaltechproject.org",
      subject: "Next steps for your community",
      html: buildHtml(r.name, r.communityName, r.communitySlug),
    }));

    const batchSize = 100;
    const results: any[] = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResult = await resend.batch.send(batch);
      results.push(batchResult);
    }

    return new Response(JSON.stringify({ success: true, recipientCount: recipients.length, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error("send-steward-welcome error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
