const serve = Deno.serve;
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

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

// Decode a data: URL and upload it to the supply-images bucket. Returns the public URL.
// If the input isn't a data URL, returns it unchanged.
async function uploadDataUrlToStorage(
  supabase: ReturnType<typeof createClient>,
  value: string,
  ownerId: string,
  supplyId: string,
): Promise<string> {
  if (!value || !value.startsWith('data:')) return value;
  const m = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return value;
  const contentType = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let ext = contentType.split('/')[1]?.split('+')[0] || 'png';
  if (ext === 'jpeg') ext = 'jpg';
  const path = `${ownerId}/illustration/${supplyId}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('supply-images').upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.error('Storage upload failed for illustration:', error.message);
    throw new Error('Failed to store illustration in bucket');
  }
  return supabase.storage.from('supply-images').getPublicUrl(path).data.publicUrl;
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

    const { supplyId, itemName, description, imageUrl } = await req.json();
    console.log('Generating illustration for:', itemName, 'by user:', user.id);

    // Ownership/authorization check: only the supply owner or a steward of the
    // supply's community may (re)generate its illustration.
    if (!supplyId || typeof supplyId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'supplyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: supplyRow, error: supplyErr } = await supabase
      .from('supplies')
      .select('owner_id, community_id')
      .eq('id', supplyId)
      .single();
    if (supplyErr || !supplyRow) {
      return new Response(
        JSON.stringify({ error: 'Supply not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let authorized = supplyRow.owner_id === user.id;
    if (!authorized) {
      const { data: isSteward } = await supabase.rpc('is_steward_of', {
        _user_id: user.id,
        _community_id: supplyRow.community_id,
      });
      authorized = !!isSteward;
    }
    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to modify this supply' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `Create a minimalist black and white line drawing illustration of: ${itemName}. 
    
Style requirements:
- Simple, clean line art similar to technical catalog illustrations
- Black lines on white background
- No shading, no gradients, no color
- Clear, recognizable silhouette
- Product-focused perspective
- Technical drawing aesthetic like McMaster-Carr catalog
- IMPORTANT: NO TEXT, NO LABELS, NO CAPTIONS within the image itself
- Only draw the object, do not include any written words or descriptions in the image

Item description: ${description}

Make it simple, iconic, and immediately recognizable. The drawing should contain ONLY the visual representation of the item, with absolutely no text or labels anywhere in the image.`;

    // Helper: call OpenAI's image endpoint (guaranteed square framing).
    async function callOpenAI(): Promise<{ ok: true; dataUrl: string } | { ok: false; status: number; error: string }> {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-image-2',
          prompt,
          size: '1024x1024',
          quality: 'low',
          n: 1,
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        return { ok: false, status: res.status, error };
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return { ok: false, status: 500, error: 'OpenAI returned no image data' };
      return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
    }

    // Helper: call Gemini via chat-completions image shape (fallback on OpenAI policy rejections).
    async function callGemini(): Promise<{ ok: true; dataUrl: string } | { ok: false; status: number; error: string }> {
      const geminiPrompt = `${prompt}

CRITICAL FRAMING: Output a square 1:1 aspect ratio image. The entire object must be fully visible and centered, with generous white margin/padding on all four sides. Do NOT crop, cut off, or zoom into any part of the object. The object should occupy roughly 70% of the frame, surrounded by white space.`;
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: geminiPrompt }],
          modalities: ['image', 'text'],
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        return { ok: false, status: res.status, error };
      }
      const data = await res.json();
      const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) return { ok: false, status: 500, error: 'Gemini returned no image data' };
      return { ok: true, dataUrl: url };
    }


    // Try OpenAI first (square framing). Fall back to Gemini on 4xx (policy/moderation).
    let provider: 'openai' | 'gemini' = 'openai';
    let result = await callOpenAI();
    if (!result.ok) {
      console.error('OpenAI image gen failed:', result.status, result.error);
      if (result.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (result.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // 4xx (likely content policy) or 5xx — try Gemini as a fallback.
      console.log('Falling back to Gemini for illustration generation');
      const fallback = await callGemini();
      if (!fallback.ok) {
        console.error('Gemini fallback also failed:', fallback.status, fallback.error);
        throw new Error(`Image generation failed (OpenAI: ${result.status}; Gemini: ${fallback.status})`);
      }
      result = fallback;
      provider = 'gemini';
    }
    console.log('illustration provider:', provider, 'for supply:', supplyId);

    const generatedImage = result.dataUrl;


    // Upload the base64 image to Storage so we never bloat the supplies table.
    const storedUrl = await uploadDataUrlToStorage(supabase, generatedImage, user.id, supplyId);

    const { error: updateError } = await supabase
      .from('supplies')
      .update({ illustration_url: storedUrl })
      .eq('id', supplyId);

    if (updateError) {
      console.error('Error updating supply:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, illustrationUrl: generatedImage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-illustration:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});