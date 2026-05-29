import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
}

interface TwitchUserResponse {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    email?: string;
    created_at: string;
  }>;
}

interface StreamElementsPointsResponse {
  channel: string;
  username: string;
  points: number;
  pointsAlltime: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID');
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
    const twitchRedirectUri = Deno.env.get('TWITCH_REDIRECT_URI');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!twitchClientId || !twitchClientSecret) {
      throw new Error('Twitch configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (req.method === 'GET' && action === 'auth-url') {
      const state = url.searchParams.get('state');
      if (!state) {
        return new Response(
          JSON.stringify({ error: 'State parameter required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
        `client_id=${twitchClientId}&` +
        `redirect_uri=${encodeURIComponent(twitchRedirectUri || '')}&` +
        `response_type=code&` +
        `scope=user:read:email&` +
        `state=${state}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'POST' && action === 'link') {
      console.log('=== LINKING TWITCH ACCOUNT ===');

      const { code, steam_id, user_id } = await req.json();

      if (!code || !steam_id || !user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: code, steam_id, user_id' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: twitchClientId,
          client_secret: twitchClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: twitchRedirectUri || '',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Twitch token error:', error);
        throw new Error('Failed to get Twitch access token');
      }

      const tokenData: TwitchTokenResponse = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Client-Id': twitchClientId,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get Twitch user info');
      }

      const userData: TwitchUserResponse = await userResponse.json();
      const twitchUser = userData.data[0];

      if (!twitchUser) {
        throw new Error('No Twitch user data returned');
      }

      console.log('Twitch user:', twitchUser.login);

      const { data: existingLink, error: checkError } = await supabase
        .from('user_twitch_accounts')
        .select('*')
        .eq('twitch_user_id', twitchUser.id)
        .maybeSingle();

      if (existingLink && existingLink.user_id !== user_id) {
        return new Response(
          JSON.stringify({ error: 'This Twitch account is already linked to another user' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const twitchAccountData = {
        user_id: user_id,
        steam_id: steam_id,
        twitch_user_id: twitchUser.id,
        twitch_username: twitchUser.login,
        twitch_display_name: twitchUser.display_name,
        twitch_profile_image: twitchUser.profile_image_url,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        is_active: true,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: twitchAccount, error: insertError } = await supabase
        .from('user_twitch_accounts')
        .upsert(twitchAccountData, { onConflict: 'twitch_user_id' })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to link Twitch account:', insertError);
        throw new Error('Failed to link Twitch account');
      }

      console.log('✅ Twitch account linked successfully');

      return new Response(
        JSON.stringify({
          success: true,
          twitch_account: {
            id: twitchAccount.id,
            twitch_username: twitchAccount.twitch_username,
            twitch_display_name: twitchAccount.twitch_display_name,
            twitch_profile_image: twitchAccount.twitch_profile_image,
          },
          message: 'Twitch account linked successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'POST' && action === 'sync-points') {
      console.log('=== SYNCING STREAMELEMENTS POINTS ===');

      const { user_id, steam_id, streamelements_channel_id } = await req.json();

      if (!user_id || !steam_id || !streamelements_channel_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data: twitchAccount, error: twitchError } = await supabase
        .from('user_twitch_accounts')
        .select('*')
        .eq('user_id', user_id)
        .eq('steam_id', steam_id)
        .single();

      if (twitchError || !twitchAccount) {
        return new Response(
          JSON.stringify({ error: 'Twitch account not linked' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const seUrl = `https://api.streamelements.com/kappa/v2/points/${streamelements_channel_id}/${twitchAccount.twitch_username}`;

      const seResponse = await fetch(seUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!seResponse.ok) {
        console.error('StreamElements API error:', seResponse.status);
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch StreamElements points',
            status: seResponse.status,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const seData: StreamElementsPointsResponse = await seResponse.json();
      console.log('StreamElements points:', seData.points);

      const { data: wallet, error: walletError } = await supabase
        .from('loyalty_points_wallets')
        .select('*')
        .eq('twitch_account_id', twitchAccount.id)
        .single();

      if (walletError || !wallet) {
        return new Response(
          JSON.stringify({ error: 'Loyalty wallet not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const currentBalance = Number(wallet.points_balance);
      const newPoints = seData.points;
      const difference = newPoints - currentBalance;

      if (difference !== 0) {
        console.log(`Syncing points: ${currentBalance} → ${newPoints} (${difference > 0 ? '+' : ''}${difference})`);

        const { error: syncError } = await supabase.rpc('update_loyalty_wallet_balance', {
          p_wallet_id: wallet.id,
          p_amount: difference,
          p_transaction_type: 'sync_from_se',
          p_description: `Synced ${Math.abs(difference)} points ${difference > 0 ? 'from' : 'to'} StreamElements`,
          p_metadata: {
            streamelements_channel: streamelements_channel_id,
            se_points: newPoints,
            se_points_alltime: seData.pointsAlltime,
          },
        });

        if (syncError) {
          console.error('Failed to sync points:', syncError);
          throw new Error('Failed to update loyalty wallet');
        }
      }

      await supabase
        .from('loyalty_points_wallets')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', wallet.id);

      await supabase
        .from('user_twitch_accounts')
        .update({
          last_synced_at: new Date().toISOString(),
          streamelements_channel_id: streamelements_channel_id,
        })
        .eq('id', twitchAccount.id);

      console.log('✅ Points synced successfully');

      return new Response(
        JSON.stringify({
          success: true,
          points: newPoints,
          difference: difference,
          synced_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'DELETE' && action === 'unlink') {
      console.log('=== UNLINKING TWITCH ACCOUNT ===');

      const { user_id, steam_id } = await req.json();

      if (!user_id || !steam_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { error: deleteError } = await supabase
        .from('user_twitch_accounts')
        .delete()
        .eq('user_id', user_id)
        .eq('steam_id', steam_id);

      if (deleteError) {
        console.error('Failed to unlink Twitch:', deleteError);
        throw new Error('Failed to unlink Twitch account');
      }

      console.log('✅ Twitch account unlinked');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Twitch account unlinked successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint or method' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('=== TWITCH INTEGRATION ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process Twitch integration',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
