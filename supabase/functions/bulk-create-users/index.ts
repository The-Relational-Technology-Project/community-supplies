import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify they're a steward
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user is a steward using the admin client
    const { data: isSteward, error: stewardError } = await supabaseAdmin
      .rpc('is_user_steward', { user_id: user.id });

    if (stewardError || !isSteward) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only stewards can create user accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the steward's community_id to enforce data isolation
    const { data: stewardProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('community_id')
      .eq('id', user.id)
      .single();

    if (profileError || !stewardProfile?.community_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not determine your community' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const communityId = stewardProfile.community_id;

    // Get approved/vouched join requests scoped to steward's community only
    const { data: joinRequests, error: joinError } = await supabaseAdmin
      .from('join_requests')
      .select('name, email, status')
      .eq('community_id', communityId)
      .in('status', ['approved', 'vouched']);

    if (joinError) throw joinError;

    const results = [];

    for (const request of joinRequests || []) {
      try {
        // Check if user already exists in profiles (which means they have an auth account)
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', request.email)
          .maybeSingle();

        if (existingProfile) {
          results.push({
            email: request.email,
            status: 'already_exists',
            message: 'User already has an account'
          });
          continue;
        }

        // Create auth user with community_id in metadata
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: request.email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            name: request.name,
            community_id: communityId,
          }
        });

        if (authError) throw authError;

        // The trigger should automatically create the profile, but let's verify
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', authUser.user.id)
          .maybeSingle();

        if (!profile) {
          // Create profile manually if trigger didn't work, scoped to community
          await supabaseAdmin
            .from('profiles')
            .insert({
              id: authUser.user.id,
              name: request.name,
              email: request.email,
              community_id: communityId,
            });
        }

        results.push({
          email: request.email,
          status: 'created',
          user_id: authUser.user.id,
          message: 'User account created successfully'
        });

      } catch (error) {
        results.push({
          email: request.email,
          status: 'error',
          message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: results.length,
          created: results.filter(r => r.status === 'created').length,
          already_exists: results.filter(r => r.status === 'already_exists').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});