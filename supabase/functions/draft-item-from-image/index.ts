import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
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

const DraftItemSchema = z.object({
  imageUrl: z.string()
    .trim()
    .min(1, "Image URL is required")
    .max(5000, "Image URL is too long")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:' || url.startsWith('data:image/');
        } catch {
          return url.startsWith('data:image/');
        }
      },
      "Must be a valid HTTP/HTTPS URL or data URL"
    ),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
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

    const rawBody = await req.json();
    const validationResult = DraftItemSchema.safeParse(rawBody);
    
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

    const { imageUrl } = validationResult.data;
    const userId = user.id;

    const { data: recentItems } = await supabase
      .from('supplies')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const recentItem = recentItems?.[0];

    let contextPrompt = '';
    if (recentItem) {
      contextPrompt = `\n\nThe user's most recent item listing used this contact info and rules style:\n` +
        `Contact: ${recentItem.contact_email || 'Not specified'}\n` +
        `House Rules: ${recentItem.house_rules?.join(', ') || 'None specified'}\n` +
        `Match their tone for the description, but DO NOT carry over location data.`;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an assistant that helps create item listings for a party supply sharing community.
Analyze the uploaded image and create a draft listing with:
- name: Short, descriptive name (max 60 chars)
- description: Helpful description (2-3 sentences, max 200 chars)
- category: One of: tools, home-diy, art-craft, camping-outdoors, sports, beach-surf, party-events, kitchen, kids, misc
- condition: One of: excellent, good, fair

CRITICAL: Do NOT guess or invent location, neighborhood, or cross streets. The user will fill those in themselves. Only return the four fields above.

Return ONLY valid JSON with these exact keys (name, description, category, condition), no markdown formatting.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this party supply item and create a listing.${contextPrompt}` },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    let draftedItem;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      draftedItem = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    // Strip any location fields the model may have produced anyway —
    // the user enters those manually for accuracy.
    delete (draftedItem as any).neighborhood;
    delete (draftedItem as any).crossStreets;
    delete (draftedItem as any).location;

    const result = {
      ...draftedItem,
      neighborhood: '',
      crossStreets: '',
      contactEmail: recentItem?.contact_email || '',
      houseRules: recentItem?.house_rules || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in draft-item-from-image:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});