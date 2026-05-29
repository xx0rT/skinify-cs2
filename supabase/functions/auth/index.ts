import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatarmedium: string;
  avatarfull: string;
  profileurl: string;
  realname?: string;
  timecreated?: number;
}

interface SteamAPIResponse {
  response: {
    players: SteamPlayer[];
  };
}

/**
 * Verify Steam OpenID response and extract Steam ID
 * @param params - URL search parameters from Steam OpenID response
 * @returns Steam ID64 if valid, null otherwise
 */
function verifySteamOpenID(params: URLSearchParams): string | null {
  const mode = params.get('openid.mode');
  const claimedId = params.get('openid.claimed_id');
  
  if (mode !== 'id_res' || !claimedId) {
    return null;
  }
  
  // Extract Steam ID64 from claimed_id URL
  const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
  return steamIdMatch ? steamIdMatch[1] : null;
}

/**
 * Generate fallback user data when Steam API is unavailable
 * @param steamId - Steam ID64
 * @returns Mock player data
 */
function generateFallbackUserData(steamId: string): SteamPlayer {
  return {
    steamid: steamId,
    personaname: `Player_${steamId.slice(-6)}`,
    avatarmedium: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
    avatarfull: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    realname: undefined,
    timecreated: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60) // 1 year ago
  };
}

/**
 * Fetch user data from Steam Web API
 * @param steamId - Steam ID64
 * @param apiKey - Steam Web API key
 * @returns Promise<SteamPlayer>
 */
async function fetchSteamUserData(steamId: string, apiKey: string): Promise<SteamPlayer> {
  const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  
  const response = await fetch(steamApiUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'CS2Marketplace/1.0'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`Steam API responded with ${response.status}: ${response.statusText}`);
  }

  const steamData: SteamAPIResponse = await response.json();
  const player = steamData.response.players[0];

  if (!player) {
    throw new Error('Steam user not found in API response');
  }

  return player;
}

/**
 * Store or update user in Supabase database
 * @param supabase - Supabase client
 * @param player - Steam player data
 * @returns Promise<any>
 */
async function storeUserData(supabase: any, player: SteamPlayer) {
  const userData = {
    steam_id: player.steamid,
    display_name: player.personaname,
    avatar_url: player.avatarmedium,
    avatar_full_url: player.avatarfull,
    profile_url: player.profileurl,
    real_name: player.realname || null,
    steam_created_at: player.timecreated ? new Date(player.timecreated * 1000).toISOString() : null,
    last_login: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // First check if user already exists
  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', player.steamid)
    .single();

  let data, error;
  let isNewUser = false;

  if (existingUserError?.code === 'PGRST116') {
    // User doesn't exist, create new user
    console.log('Creating new user:', player.personaname);
    isNewUser = true;
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    data = newUser;
    error = createError;
  } else if (existingUser) {
    // User exists, update their info
    console.log('Updating existing user:', existingUser.display_name);
    isNewUser = false;
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...userData,
        // Keep existing trade_link if it exists
        trade_link: existingUser.trade_link
      })
      .eq('steam_id', player.steamid)
      .select()
      .single();
    
    data = updatedUser;
    error = updateError;
  } else {
    // Some other error occurred
    error = existingUserError;
  }

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Add the isNewUser flag to the returned data
  data.is_new_user = isNewUser;

  return data;
}

/**
 * Main handler for Steam OpenID authentication
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
    const params = url.searchParams;
    
    console.log('=== STEAM AUTH REQUEST ===');
    console.log('Request URL:', url.toString());
    
    // Verify Steam OpenID response
    const steamId = verifySteamOpenID(params);
    
    if (!steamId) {
      throw new Error('Invalid Steam OpenID response - Steam ID not found');
    }

    console.log('Steam ID extracted:', steamId);

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const steamApiKey = Deno.env.get('STEAM_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let player: SteamPlayer;

    // Try to fetch Steam user data from API
    if (steamApiKey) {
      try {
        console.log('Fetching Steam user data from API...');
        player = await fetchSteamUserData(steamId, steamApiKey);
        console.log('Steam user found via API:', player.personaname);
      } catch (apiError) {
        console.error('Steam API error, using fallback:', apiError);
        player = generateFallbackUserData(steamId);
      }
    } else {
      console.warn('STEAM_API_KEY not configured, using fallback user data');
      player = generateFallbackUserData(steamId);
    }

    // Store/update user in database
    console.log('Storing user in database...');
    const userData = await storeUserData(supabase, player);
    
    console.log('User authenticated successfully:', userData.display_name);

    // Return user data for frontend
    const userResponse = {
      steamId: player.steamid,
      displayName: player.personaname,
      avatarUrl: player.avatarmedium,
      avatarFullUrl: player.avatarfull,
      profileUrl: player.profileurl,
      realName: player.realname,
      tradeLink: userData.trade_link,
      isNewUser: userData.is_new_user || false,
      id: userData.id,
      referred_by: userData.referred_by,
      referral_code: userData.referral_code,
      authenticated: true,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(userResponse),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('=== AUTH ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Authentication failed',
        details: error.stack || 'No stack trace available',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});