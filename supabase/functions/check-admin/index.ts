import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    let checkMethod = 'unknown';

    // METHOD 1: Check if POST request with Steam ID
    if (req.method === 'POST') {
      const body = await req.json();
      const steamId = body.steamId;

      if (steamId) {
        console.log('[check-admin] Method: Steam ID check for:', steamId);
        checkMethod = 'steamId';

        // Look up user by steam_id in users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', steamId)
          .maybeSingle();

        if (userError) {
          console.error('[check-admin] Error looking up Steam ID:', userError);
        } else if (userRecord) {
          userId = userRecord.id;
          console.log('[check-admin] Found user ID from Steam ID:', userId);
        } else {
          console.log('[check-admin] No user found for Steam ID:', steamId);
        }
      }
    }

    // METHOD 2: Get user from JWT (GET request or POST without steamId)
    if (!userId) {
      console.log('[check-admin] Method: JWT auth check');
      checkMethod = 'jwt';
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token', isAdmin: false }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userId = user.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Could not identify user', isAdmin: false }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin
    console.log('[check-admin] Checking admin status for user:', userId, 'via', checkMethod);

    const { data: adminRole, error: roleError } = await supabase
      .from('admin_roles')
      .select('role, permissions, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[check-admin] Query result:', { adminRole, roleError });

    if (roleError) {
      console.error('[check-admin] Error checking admin role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Database error', isAdmin: false }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if is_active is true OR null (for backward compatibility)
    const isActive = adminRole?.is_active !== false;
    const isAdmin = !!adminRole && isActive;

    console.log('[check-admin] Final result:', { isAdmin, isActive, role: adminRole?.role });

    return new Response(
      JSON.stringify({
        isAdmin,
        role: adminRole?.role || null,
        permissions: adminRole?.permissions || [],
        userId: userId,
        checkMethod,
        debug: {
          hasAdminRole: !!adminRole,
          isActive: adminRole?.is_active,
          calculatedIsActive: isActive,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-admin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', isAdmin: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
