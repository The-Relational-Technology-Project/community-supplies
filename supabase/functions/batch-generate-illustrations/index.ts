import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication and steward status
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
        JSON.stringify({ error: 'Only stewards can run batch illustration generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Batch illustration generation started by steward:', user.id);

    const { data: supplies, error } = await supabase
      .from('supplies')
      .select('id, name, description, images, image_url')
      .is('illustration_url', null);

    if (error) throw error;

    if (!supplies || supplies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All items already have illustrations', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating illustrations for ${supplies.length} items...`);
    const results = [];

    for (const supply of supplies) {
      try {
        const prompt = `Create a minimalist black and white line drawing illustration of: ${supply.name}. 
        
Style requirements:
- Simple, clean line art similar to technical catalog illustrations
- Black lines on white background
- No shading, no gradients, no color
- Clear, recognizable silhouette
- Product-focused perspective
- Technical drawing aesthetic like McMaster-Carr catalog
- IMPORTANT: NO TEXT, NO LABELS, NO CAPTIONS within the image itself
- Only draw the object, do not include any written words or descriptions in the image

Item description: ${supply.description}

Make it simple, iconic, and immediately recognizable. The drawing should contain ONLY the visual representation of the item, with absolutely no text or labels anywhere in the image.`;

        console.log(`Generating illustration for: ${supply.name}`);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [{ role: 'user', content: prompt }],
            modalities: ['image', 'text']
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI error for ${supply.name}:`, aiResponse.status, errorText);
          results.push({ id: supply.id, name: supply.name, success: false, error: errorText });
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (!generatedImage) {
          console.error(`No image generated for ${supply.name}`);
          results.push({ id: supply.id, name: supply.name, success: false, error: 'No image generated' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('supplies')
          .update({ illustration_url: generatedImage })
          .eq('id', supply.id);

        if (updateError) {
          console.error(`Error updating ${supply.name}:`, updateError);
          results.push({ id: supply.id, name: supply.name, success: false, error: updateError.message });
        } else {
          console.log(`✓ Generated illustration for: ${supply.name}`);
          results.push({ id: supply.id, name: supply.name, success: true });
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (itemError) {
        console.error(`Error processing ${supply.name}:`, itemError);
        results.push({ 
          id: supply.id, 
          name: supply.name, 
          success: false, 
          error: itemError instanceof Error ? itemError.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Batch generation complete: ${successCount}/${supplies.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: 'Batch generation complete',
        total: supplies.length,
        successful: successCount,
        failed: supplies.length - successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch generation error:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});