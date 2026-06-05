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
        JSON.stringify({ error: 'Only stewards can run batch illustration generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const communityId: string | undefined = body?.communityId;
    if (!communityId) {
      return new Response(
        JSON.stringify({ error: 'communityId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Batch illustration generation started by steward:', user.id, 'community:', communityId);

    const { data: supplies, error } = await supabase
      .from('supplies')
      .select('id, name, description, images, image_url, owner_id')
      .eq('community_id', communityId)
      .is('illustration_url', null);

    if (error) throw error;

    if (!supplies || supplies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All items already have illustrations', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating illustrations for ${supplies.length} items in community ${communityId}...`);
    const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

    for (const supply of supplies) {
      try {
        const imageUrl = supply.images?.[0] || supply.image_url || undefined;
        const { data, error: invokeError } = await supabase.functions.invoke('generate-illustration', {
          body: {
            supplyId: supply.id,
            itemName: supply.name,
            description: supply.description ?? '',
            imageUrl,
          },
          headers: { Authorization: authHeader },
        });

        if (invokeError) {
          console.error(`Invoke error for ${supply.name}:`, invokeError);
          results.push({ id: supply.id, name: supply.name, success: false, error: invokeError.message });
        } else if (data?.error) {
          console.error(`AI error for ${supply.name}:`, data.error);
          results.push({ id: supply.id, name: supply.name, success: false, error: data.error });
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
          error: itemError instanceof Error ? itemError.message : 'Unknown error',
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
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch generation error:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
