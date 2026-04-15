import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
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

const SendBulkUpdateSchema = z.object({
  subject: z.string().min(1).max(200),
  excludeEmails: z.array(z.string().email()).optional().default([]),
  dryRun: z.boolean().optional().default(false),
  communityId: z.string().uuid("Invalid community ID"),
});

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isSteward } = await supabase.rpc('is_user_steward', { user_id: user.id });
    if (!isSteward) {
      return new Response(
        JSON.stringify({ error: 'Only stewards can send bulk emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.json();
    const validationResult = SendBulkUpdateSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, excludeEmails, dryRun, communityId } = validationResult.data;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('community_id', communityId)
      .not('email', 'in', `(${excludeEmails.map(e => `"${e}"`).join(',')})`)
      .order('name');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipients = profiles.filter(p => !excludeEmails.includes(p.email));

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, dryRun: true,
          recipientCount: recipients.length,
          recipients: recipients.map(r => ({ name: r.name, email: r.email }))
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const resend = new Resend(resendApiKey);

    const booksImageUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/books.png`;
    const homeImageUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/home.png`;

    const emails = recipients.map(recipient => {
      const safeName = escapeHtml(recipient.name || 'Neighbor');
      const firstName = safeName.split(' ')[0];

      return {
        from: "Community Party Supplies <josh@relationaltechproject.org>",
        to: [recipient.email],
        subject: subject,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #c97a54 0%, #a85d3a 100%); padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 32px; }
    .feature-section { margin: 24px 0; padding: 20px; background: #fef9f6; border-radius: 8px; border-left: 4px solid #c97a54; }
    .feature-title { font-size: 18px; font-weight: 600; color: #8b4c34; margin-bottom: 12px; }
    .screenshot { width: 100%; max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .cta-button { display: inline-block; background: #c97a54; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px 32px; background: #f8f4f2; text-align: center; color: #666; font-size: 14px; }
    p { margin: 0 0 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Community Party Supplies</h1>
    </div>
    <div class="content">
      <p>Hey ${firstName}!</p>
      <p>Hope you're doing well! I wanted to share a couple of exciting updates to our community sharing site.</p>
      <div class="feature-section">
        <div class="feature-title">📚 New: Community Book Library</div>
        <p>You can now share books from your home library with neighbors! Just snap a photo of your bookshelf, and our AI will automatically detect all the titles. It's a super easy way to lend out books you've already read.</p>
        <img src="${booksImageUrl}" alt="Community Book Library screenshot" class="screenshot" />
      </div>
      <div class="feature-section">
        <div class="feature-title">✨ Fresh New Look</div>
        <p>The whole site got a visual refresh! The supplies catalog is now cleaner and easier to browse, with a warmer, more inviting design.</p>
        <img src="${homeImageUrl}" alt="Redesigned homepage screenshot" class="screenshot" />
      </div>
      <p>Come check it out when you get a chance:</p>
      <p style="text-align: center;">
        <a href="https://sunset-block-party-supplies.lovable.app" class="cta-button">Visit the Site</a>
      </p>
      <p>As always, if you have party supplies, games, decorations, or now books you'd like to share with neighbors, we'd love to have you add them!</p>
      <p>Cheers,<br>Josh</p>
    </div>
    <div class="footer">
      <p>Community Party Supplies<br>Sunset & Richmond, SF</p>
    </div>
  </div>
</body>
</html>
        `,
      };
    });

    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResult = await resend.batch.send(batch);
      results.push(batchResult);
    }

    return new Response(
      JSON.stringify({ success: true, recipientCount: recipients.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error sending bulk update:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});