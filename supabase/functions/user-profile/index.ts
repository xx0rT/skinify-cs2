import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Main user profile handler
 */
Deno.serve(async (req) => {
  console.log('=== USER PROFILE REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('Environment check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseServiceKey
  });
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase configuration missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // PUT HANDLER FOR TRADE LINK UPDATES
  if (req.method === 'PUT') {
    console.log('=== PUT REQUEST RECEIVED FOR TRADE LINK UPDATE ===');
    
    let updateData;
    try {
      updateData = await req.json();
      console.log('Parsed request data:', updateData);
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }
    
    const steamId = updateData.steam_id;
    const tradeLink = updateData.trade_link;
    
    console.log('Update request details:', {
      steam_id: steamId,
      has_trade_link: !!tradeLink,
      trade_link_length: tradeLink?.length || 0
    });
    
    if (!steamId) {
      return new Response(
        JSON.stringify({ error: 'steam_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Validate trade link format if provided
    if (tradeLink && tradeLink.trim()) {
      const tradeLinkPattern = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
      const trimmedTradeLink = tradeLink.trim();
      
      console.log('Trade link validation:', {
        original: tradeLink,
        trimmed: trimmedTradeLink,
        pattern_match: tradeLinkPattern.test(trimmedTradeLink)
      });
      
      if (!tradeLinkPattern.test(trimmedTradeLink)) {
        console.log('❌ Invalid trade link format');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid trade link format',
            expected_format: 'https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXX&token=XXXXXXXX',
            received: trimmedTradeLink
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
    }

    console.log('✅ Trade link format validation passed');

    // Check if user exists
    console.log('=== CHECKING IF USER EXISTS ===');
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, steam_id, display_name')
      .eq('steam_id', steamId)
      .single();

    if (userCheckError || !existingUser) {
      console.error('User not found for update:', userCheckError);
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          steam_id: steamId,
          message: 'Please ensure you are logged in with Steam'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('User found:', existingUser.display_name);

    // UPDATE TRADE LINK IN DATABASE
    console.log('=== UPDATING TRADE LINK IN DATABASE ===');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        trade_link: tradeLink?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('steam_id', steamId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update trade link',
          details: updateError.message,
          code: updateError.code
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('✅ Trade link updated successfully in database');
    console.log('Updated trade link:', updatedUser.trade_link);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          steam_id: updatedUser.steam_id,
          display_name: updatedUser.display_name,
          trade_link: updatedUser.trade_link
        },
        message: 'Trade link updated successfully'
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  }

  // GET method for fetching user profile
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const steamId = url.searchParams.get('steam_id');
    
    if (!steamId) {
      return new Response(
        JSON.stringify({ error: 'steam_id parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log(`=== FETCHING USER PROFILE FOR ${steamId} ===`);

    /* PII minimisation: this GET is public (called with the anon key for
       seller avatars/cards), so it must return ONLY non-sensitive public
       fields. Never `select('*')` here — the row also holds email,
       balances and the trade_link. The trade_link in particular is a
       Steam partner token that lets anyone send the user trade offers, so
       it is deliberately excluded from the public response (the owner
       reads their own via an authenticated path). */
    const { data: user, error } = await supabase
      .from('users')
      .select('steam_id, display_name, avatar_url, created_at, last_login')
      .eq('steam_id', steamId)
      .single();

    if (error) {
      console.error('User not found:', error);
      return new Response(
        JSON.stringify({
          error: 'User not found',
          steam_id: steamId
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          steam_id: user.steam_id,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          last_login: user.last_login
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  }

  // POST HANDLER FOR REVIEWS
  if (req.method === 'POST') {
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    if (endpoint === 'review') {
      console.log('=== POST REVIEW REQUEST ===');

      try {
        const reviewData = await req.json();
        console.log('Review data:', reviewData);

        const { reviewer_steam_id, reviewed_steam_id, rating, comment, order_id } = reviewData;

        if (!reviewer_steam_id || !reviewed_steam_id || !rating || !comment) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
          );
        }

        if (reviewer_steam_id === reviewed_steam_id) {
          return new Response(
            JSON.stringify({ error: 'You cannot review yourself' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
          );
        }

        // Get user IDs from steam IDs
        const { data: reviewerUser } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', reviewer_steam_id)
          .maybeSingle();

        const { data: reviewedUser } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', reviewed_steam_id)
          .maybeSingle();

        if (!reviewerUser || !reviewedUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
          );
        }

        // Insert review
        const { data: review, error: reviewError } = await supabase
          .from('user_reviews')
          .insert({
            reviewer_id: reviewerUser.id,
            reviewed_user_id: reviewedUser.id,
            order_id: order_id || null,
            rating: parseInt(rating),
            comment: comment.trim(),
            is_verified_purchase: !!order_id
          })
          .select()
          .single();

        if (reviewError) {
          console.error('Review insert error:', reviewError);

          if (reviewError.code === '23505') { // Unique constraint violation
            return new Response(
              JSON.stringify({ error: 'You have already reviewed this order' }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
            );
          }

          throw reviewError;
        }

        return new Response(
          JSON.stringify({ success: true, review }),
          { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      } catch (error) {
        console.error('Error creating review:', error);
        return new Response(
          JSON.stringify({ error: error.message || 'Failed to create review' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
    }
  }

  // Method not allowed
  console.log('=== UNSUPPORTED METHOD ===');
  console.log('Received method:', req.method);
  console.log('Supported methods: GET, POST, PUT, OPTIONS');

  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      method: req.method,
      allowed_methods: ['GET', 'POST', 'PUT', 'OPTIONS']
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST, PUT, OPTIONS',
        ...corsHeaders
      }
    }
  );
});