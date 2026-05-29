import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface PresenceUpdate {
  steam_id: string;
  status: 'online' | 'away' | 'offline';
  timestamp: string;
}

// In-memory presence store for demo (in production, use Redis or database)
const presenceStore = new Map<string, PresenceUpdate>();

/**
 * Clean up old presence records
 */
function cleanupOldPresence() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  
  for (const [steamId, presence] of presenceStore.entries()) {
    const lastSeen = new Date(presence.timestamp);
    if (lastSeen < cutoff) {
      presenceStore.delete(steamId);
    }
  }
}

/**
 * Get user's current online status
 */
function getUserPresence(steamId: string): 'online' | 'away' | 'offline' {
  const presence = presenceStore.get(steamId);
  if (!presence) return 'offline';
  
  const lastSeen = new Date(presence.timestamp);
  const now = new Date();
  const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
  
  // If last seen more than 2 minutes ago, consider offline
  if (minutesAgo > 2) return 'offline';
  
  return presence.status;
}

/**
 * Main presence handler
 */
Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      // Update user presence
      const presenceData: PresenceUpdate = await req.json();
      
      if (!presenceData.steam_id || !presenceData.status) {
        return new Response(
          JSON.stringify({ error: 'steam_id and status are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log(`=== PRESENCE UPDATE ===`);
      console.log(`User ${presenceData.steam_id} is now ${presenceData.status}`);

      // Store presence in memory
      presenceStore.set(presenceData.steam_id, {
        steam_id: presenceData.steam_id,
        status: presenceData.status,
        timestamp: presenceData.timestamp || new Date().toISOString()
      });

      // Update user's last_login in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('steam_id', presenceData.steam_id);

      if (updateError) {
        console.error('Failed to update last_login:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          status: presenceData.status,
          timestamp: presenceData.timestamp
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'GET') {
      // Get presence status for users
      const steamIds = url.searchParams.get('steam_ids')?.split(',') || [];
      const singleSteamId = url.searchParams.get('steam_id');
      
      if (singleSteamId) {
        // Get single user status
        const status = getUserPresence(singleSteamId);
        const presence = presenceStore.get(singleSteamId);
        
        return new Response(
          JSON.stringify({
            steam_id: singleSteamId,
            status,
            last_seen: presence?.timestamp || null,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else if (steamIds.length > 0) {
        // Get multiple user statuses
        const statuses = steamIds.map(steamId => ({
          steam_id: steamId,
          status: getUserPresence(steamId),
          last_seen: presenceStore.get(steamId)?.timestamp || null
        }));
        
        return new Response(
          JSON.stringify({
            users: statuses,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

      // Clean up old presence records
      cleanupOldPresence();

      return new Response(
        JSON.stringify({ error: 'steam_id or steam_ids parameter required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('=== PRESENCE ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process presence request',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});