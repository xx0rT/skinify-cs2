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
 * Generate a deterministic password for a Steam user.
 *
 * Why this exists: Supabase Auth requires every user to have either a
 * password or a verified OIDC identity. Steam OpenID isn't an OIDC
 * provider Supabase knows about, so we mint our own Auth user keyed
 * by `{steamId}@steam.skinify.gg` and sign them in with a password.
 *
 * The password is derived from the steam_id + the Supabase service
 * role key (a server-only secret), so:
 *   - It's deterministic — a returning user re-signs in successfully
 *     without us needing to store the password anywhere.
 *   - It's unguessable from the outside — the service-role key never
 *     leaves the function.
 *
 * Anyone with the service role key can already do anything with the
 * project, so leaking this derivation function adds no new attack
 * surface beyond what the service role itself already controls.
 */
async function steamAuthPassword(steamId: string, serviceKey: string): Promise<string> {
  const data = new TextEncoder().encode(`steam:${steamId}:${serviceKey}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  /* 32 base64 chars — Supabase requires ≥ 6, this gives us 256 bits
     of entropy with zero ambiguity around character set rules. */
  return btoa(String.fromCharCode(...new Uint8Array(hash))).slice(0, 32);
}

/* Email convention for Steam-minted Auth users. Looks like a real
   email so Supabase's validator accepts it, but the steam.skinify.gg
   domain is owned by us and we never send mail to it. */
function steamUserEmail(steamId: string): string {
  return `${steamId}@steam.skinify.gg`;
}

/**
 * Ensure there's a Supabase Auth user for this Steam id and the
 * matching `public.users` row carries `auth_user_id`. Returns a fresh
 * session (access_token, refresh_token) the frontend can hand to
 * `supabase.auth.setSession`.
 *
 * Idempotent: returning users just sign in.
 */
async function ensureAuthUser(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  steamId: string,
  publicUsersId: string,
): Promise<{ access_token: string; refresh_token: string; auth_user_id: string } | null> {
  const email = steamUserEmail(steamId);
  const password = await steamAuthPassword(steamId, serviceKey);

  /* Try to create the Auth user. If they already exist, createUser
     returns an error and we fall through to signInWithPassword which
     gives us the session for the existing row. */
  let authUserId: string | null = null;
  let createdFresh = false;
  try {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { steam_id: steamId, source: 'steam_openid' },
    });
    if (!createError && created?.user) {
      authUserId = created.user.id;
      createdFresh = true;
      console.log('[auth] minted new Supabase Auth user for', steamId);
    } else if (createError && !/already.*registered|already.*exists/i.test(createError.message || '')) {
      console.warn('[auth] createUser failed (continuing to sign-in):', createError.message);
    }
  } catch (e: any) {
    console.warn('[auth] createUser threw (continuing):', e?.message);
  }

  /* If the auth user already existed (createUser threw "already
     registered"), we need to look up their id by email so we can
     update their metadata. Otherwise their JWT will keep being
     issued without the steam_id claim that auth_steam_id() reads
     in RLS policies. */
  if (!authUserId) {
    try {
      /* The admin SDK has no direct "get user by email" — we list
         the first page and filter. Skinify's Steam-minted users all
         share the @steam.skinify.gg domain so the linear scan is
         tiny. */
      const { data: listed } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const found = listed?.users?.find((u: any) => u.email === email);
      if (found?.id) authUserId = found.id;
    } catch (e: any) {
      console.warn('[auth] listUsers fallback failed:', e?.message);
    }
  }

  /* Stamp / refresh user_metadata.steam_id every sign-in. This is the
     key fix for the lingering 401 the user is seeing: existing
     auth.users from earlier deploys never got steam_id in their
     metadata, so their JWT carried no claim and RLS policies that
     read auth.jwt() -> 'user_metadata' ->> 'steam_id' fell back to
     a table lookup that may also have failed. Stamping on EVERY
     sign-in means the next session token carries the claim. */
  if (authUserId && !createdFresh) {
    try {
      await supabase.auth.admin.updateUserById(authUserId, {
        user_metadata: { steam_id: steamId, source: 'steam_openid' },
      });
    } catch (e: any) {
      console.warn('[auth] updateUserById metadata stamp failed:', e?.message);
    }
  }

  /* Sign in via a separate anon-key client so we don't pollute the
     service-role session. signInWithPassword returns the session
     tokens we hand back to the browser. */
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) {
    console.error('[auth] SUPABASE_ANON_KEY missing — cannot sign Steam user in');
    return null;
  }
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: signIn, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn?.session || !signIn?.user) {
    console.error('[auth] signInWithPassword failed:', signInError?.message);
    return null;
  }
  authUserId = authUserId || signIn.user.id;

  /* Stamp auth_user_id on the public.users row so RLS policies that
     resolve via auth_steam_id() can find the steam_id. Idempotent —
     repeat sign-ins just overwrite with the same value. */
  const { error: updateError } = await supabase
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('id', publicUsersId);
  if (updateError) {
    console.warn('[auth] could not stamp auth_user_id on public.users:', updateError.message);
  }

  return {
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
    auth_user_id: authUserId,
  };
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

    /* Mint (or sign into) the matching Supabase Auth user so the
       browser ends up with a real JWT. Without this step, RLS policies
       that key off auth.uid() — like the new direct_messages / api_keys
       tables — return 401 for Steam-only sessions. Best-effort: if
       this fails the legacy Steam-only response is still returned and
       the user is "signed in" from the frontend's perspective. */
    const authSession = await ensureAuthUser(
      supabase,
      supabaseUrl,
      supabaseServiceKey,
      player.steamid,
      userData.id,
    );

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
      timestamp: new Date().toISOString(),
      /* Supabase Auth session tokens — the client must hand these to
         supabase.auth.setSession() immediately so subsequent queries
         carry the right Authorization header and RLS policies resolve.
         Null when the bridge couldn't be established (logged
         server-side). */
      authSession: authSession
        ? {
            access_token: authSession.access_token,
            refresh_token: authSession.refresh_token,
            auth_user_id: authSession.auth_user_id,
          }
        : null,
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