import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface CreateListingRequest {
  steam_id: string;
  asset_id: string;
  market_hash_name: string;
  item_name: string;
  item_type: string;
  rarity: string;
  condition: string;
  price: number;
  image_url: string;
  float_value?: string;
  pattern_template?: string;
  stickers?: string[];
  description?: string;
  listing_type?: 'standard' | 'auction' | 'private';
  auction_end_time?: string;
  minimum_bid?: number;
  buyout_price?: number;
  private_buyer_steam_id?: string;
  reserve_price?: number;
  /** Steam inspect link captured at inventory-fetch time; used by the
      CSFloat proxy hook to look up real float + paint seed values. */
  inspect_link?: string;
}

interface UpdateListingRequest {
  price?: number;
  description?: string;
  is_active?: boolean;
}

/**
 * Validate Steam ID and get user info.
 *
 * Self-heals if the user row is missing: when a Steam account is signed
 * in via Steam OpenID but the matching `public.users` row was never
 * created (or got wiped), we auto-provision a minimal record so the
 * listing flow doesn't dead-end. We always coerce steamId to a string
 * to avoid TEXT/BIGINT mismatches in the WHERE clause.
 */
async function validateSteamUser(supabase: any, steamId: string) {
  const sid = String(steamId).trim();
  if (!sid) {
    throw new Error('Missing steam_id in request.');
  }

  /* maybeSingle so "no row" returns null instead of throwing — we want
     to distinguish a missing user (auto-provision) from a real DB
     error (bubble up). */
  const lookup = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', sid)
    .maybeSingle();

  if (lookup.error && lookup.error.code !== 'PGRST116') {
    console.error('users lookup error:', lookup.error);
    throw new Error(`User lookup failed: ${lookup.error.message}`);
  }

  if (lookup.data) return lookup.data;

  /* Auto-provision. Insert is idempotent on steam_id (must have a
     unique constraint); if a race created the row first we recover by
     selecting again. */
  console.warn('Auto-provisioning users row for steam_id:', sid);
  const provisional = {
    steam_id: sid,
    display_name: `Trader_${sid.slice(-6)}`,
    avatar_url: null,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  const insert = await supabase
    .from('users')
    .insert(provisional)
    .select()
    .single();

  if (!insert.error && insert.data) return insert.data;

  /* Insert failed — likely the row was created by a concurrent
     request, or a NOT NULL column we don't know about. Fall back to a
     second select. */
  console.warn('Auto-provision insert failed, retrying lookup:', insert.error);
  const refetch = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', sid)
    .maybeSingle();

  if (refetch.data) return refetch.data;

  throw new Error(
    `User not found and auto-provision failed for steam_id ${sid}: ${insert.error?.message || 'unknown'}`,
  );
}

/**
 * Main handler for marketplace listings
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

    if (req.method === 'GET') {
      // Check if fetching by token
      const token = url.searchParams.get('token');

      if (token) {
        // Fetch single listing by share token
        console.log('=== FETCHING LISTING BY TOKEN ===');
        console.log('Token:', token);

        const { data: listing, error } = await supabase
          .from('marketplace_listings')
          .select(`
            *,
            users:user_id (
              display_name,
              avatar_url,
              steam_id
            )
          `)
          .eq('share_token', token)
          .eq('is_active', true)
          .single();

        if (error || !listing) {
          console.error('Listing not found by token:', error);
          return new Response(
            JSON.stringify({
              error: 'Listing not found',
              message: 'This listing does not exist or has been removed'
            }),
            {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 404
            }
          );
        }

        // Format the listing
        const formattedListing = {
          id: listing.id.toString(),
          asset_id: listing.asset_id,
          name: listing.item_name,
          item_name: listing.item_name,
          market_name: listing.market_hash_name,
          market_hash_name: listing.market_hash_name,
          type: listing.item_type,
          item_type: listing.item_type,
          rarity: listing.rarity,
          condition: listing.condition,
          price: Number(listing.price),
          image: listing.image_url,
          image_url: listing.image_url,
          float: listing.float_value,
          float_value: listing.float_value,
          pattern: listing.pattern_template,
          pattern_template: listing.pattern_template,
          stickers: listing.stickers,
          seller: {
            steamId: listing.steam_id,
            name: listing.users?.display_name || 'Unknown',
            avatarUrl: listing.users?.avatar_url
          },
          steam_id: listing.steam_id,
          views: listing.views,
          description: listing.description,
          listing_type: listing.listing_type,
          share_token: listing.share_token,
          private_buyer_steam_id: listing.private_buyer_steam_id
        };

        console.log('✅ Found listing by token:', formattedListing.name);

        return new Response(
          JSON.stringify({
            item: formattedListing,
            success: true
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

      // Get all active marketplace listings
      console.log('=== FETCHING MARKETPLACE LISTINGS ===');

      const steamId = url.searchParams.get('steamId');
      const userListingsOnly = url.searchParams.get('userOnly') === 'true';

      console.log(`=== FETCHING LISTINGS ===`);
      console.log('User listings only:', userListingsOnly);
      console.log('Steam ID:', steamId);
      
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          users:user_id (
            display_name,
            avatar_url,
            steam_id
          )
        `)
        .eq('is_active', true);

      // If requesting user's listings only, filter by steam_id
      if (userListingsOnly && steamId) {
        query = query.eq('steam_id', steamId);
        console.log(`Filtering for user: ${steamId}`);
      } else {
        // For public marketplace, exclude private listings
        query = query.in('listing_type', ['standard', 'auction']);
        console.log('Filtering to show only standard and auction listings (excluding private)');

        // IMPORTANT: Exclude current user's own items from marketplace
        if (steamId) {
          query = query.neq('steam_id', steamId);
          console.log(`Excluding own items for user: ${steamId}`);
        }
      }
      
      const { data: listings, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching listings:', error);
        throw new Error(`Failed to fetch listings: ${error.message}`);
      }

      console.log(`=== DATABASE QUERY RESULT ===`);
      console.log(`Total rows returned: ${listings?.length || 0}`);
      console.log('Raw listings from DB:', listings);
      console.log('First listing (if any):', listings?.[0]);
      
      // Debug user filtering
      if (userListingsOnly && steamId) {
        const userListings = listings?.filter(l => l.steam_id === steamId) || [];
        console.log(`Listings after user filter (${steamId}):`, userListings.length);
        console.log('User listings:', userListings);
      }

      // Format for frontend
      const formattedListings = (listings || []).map(listing => ({
        id: listing.id.toString(),
        asset_id: listing.asset_id,
        name: listing.item_name,
        market_name: listing.market_hash_name,
        type: listing.item_type,
        rarity: listing.rarity,
        condition: listing.condition,
        price: Number(listing.price),
        priceChange: Math.random() * 20 - 10,
        image: listing.image_url || 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O',
        expiresIn: '24:00:00',
        itemCount: 1,
        itemId: listing.asset_id || listing.id.toString(),
        special: listing.item_name.includes('StatTrak™') ? 'stattrak' :
                listing.item_name.includes('Souvenir') ? 'souvenir' : undefined,
        favorite: false,
        tradable: true,
        marketable: true,
        float: listing.float_value,
        pattern: listing.pattern_template,
        stickers: listing.stickers,
        seller: {
          steamId: listing.steam_id,
          name: listing.users?.display_name || 'Unknown'
        },
        views: listing.views,
        description: listing.description,
        listed_at: listing.created_at,
        listing_type: listing.listing_type || 'standard',
        auction_end_time: listing.auction_end_time,
        current_bid: listing.current_bid,
        minimum_bid: listing.minimum_bid,
        buyout_price: listing.buyout_price,
        bid_count: listing.bid_count || 0,
        private_buyer_steam_id: listing.private_buyer_steam_id,
        share_token: listing.share_token,
        /* Surface inspect_link to the client so the marketplace card
           hook can call /functions/v1/skin-float with real params. */
        inspect_link: listing.inspect_link || null,
      }));

      console.log(`=== FORMATTED LISTINGS ===`);
      console.log(`Formatted ${formattedListings.length} listings for frontend`);
      console.log('Formatted listings:', formattedListings);

      return new Response(
        JSON.stringify({
          items: formattedListings,
          total: formattedListings.length,
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...corsHeaders
          },
          status: 200
        }
      );

    } else if (req.method === 'POST') {
      // Create new listing - NO AUTH REQUIRED, use Steam ID from request
      console.log('=== CREATING NEW LISTING ===');
      
      const listingData: CreateListingRequest = await req.json();
      console.log('Listing request data:', {
        steam_id: listingData.steam_id,
        asset_id: listingData.asset_id,
        item_name: listingData.item_name,
        price: listingData.price
      });

      // Validate required fields
      if (!listingData.steam_id || !listingData.asset_id || !listingData.market_hash_name || !listingData.price) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: steam_id, asset_id, market_hash_name, price',
            received: {
              steam_id: !!listingData.steam_id,
              asset_id: !!listingData.asset_id,
              market_hash_name: !!listingData.market_hash_name,
              price: !!listingData.price
            }
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate user exists
      const user = await validateSteamUser(supabase, listingData.steam_id);
      console.log('User validated:', user.display_name);

      /* KYC pipeline — wrapped so missing tables (`kyc_restrictions`,
         `system_settings`, `kyc_audit_log`) or columns
         (`kyc_status`, `kyc_expires_at`, …) don't break listing
         creation. Any unexpected error in this block is logged and
         treated as "no KYC restriction" so users can still list. */
      const kycEnabled = Deno.env.get('KYC_ENABLED') !== 'false';
      if (kycEnabled) {
        try {
          const priceInEUR = listingData.price / 24.37;

          const { data: restrictions, error: restrictionsError } = await supabase
            .from('kyc_restrictions')
            .select('reason, details')
            .eq('user_id', user.id)
            .eq('restriction_type', 'listing_blocked')
            .eq('is_active', true);

          if (restrictionsError && restrictionsError.code !== 'PGRST116') {
            console.warn('KYC restrictions lookup failed:', restrictionsError.message);
          } else if (restrictions && restrictions.length > 0) {
            const restriction = restrictions[0];
            return new Response(
              JSON.stringify({
                error: 'KYC verification required',
                errorCode: 'KYC_REQUIRED',
                reason: restriction.reason,
                details: restriction.details,
                kycRequired: true,
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              }
            );
          }

          const hasValidKYC = user.kyc_status === 'approved' &&
            (!user.kyc_expires_at || new Date(user.kyc_expires_at) > new Date());

          let kycThreshold = 500;
          try {
            const { data: thresholdSetting } = await supabase
              .from('system_settings')
              .select('value')
              .eq('key', 'kyc_listing_threshold')
              .maybeSingle();
            if (thresholdSetting?.value) {
              const parsed = parseFloat(thresholdSetting.value);
              if (!Number.isNaN(parsed)) kycThreshold = parsed;
            }
          } catch (e) {
            console.warn('system_settings lookup failed (using default):', e);
          }

          if (priceInEUR >= kycThreshold && !hasValidKYC) {
            /* Fire-and-forget the side effects — if any of them fail
               (missing table, RLS, etc.), the 403 still goes out. */
            Promise.allSettled([
              supabase.from('kyc_restrictions').insert({
                user_id: user.id,
                restriction_type: 'listing_blocked',
                reason: 'kyc_required',
                details: `Listing price (€${priceInEUR.toFixed(2)}) exceeds KYC threshold (€${kycThreshold})`,
                threshold_exceeded: priceInEUR,
                is_active: true,
              }),
              supabase.from('users').update({
                kyc_required: true,
                kyc_required_reason: 'listing_threshold',
              }).eq('id', user.id),
              supabase.from('kyc_audit_log').insert({
                user_id: user.id,
                event_type: 'threshold_exceeded',
                event_description: `Listing blocked - KYC required for price €${priceInEUR.toFixed(2)}`,
                performed_by_role: 'system',
                metadata: {
                  price_eur: priceInEUR,
                  price_czk: listingData.price,
                  threshold: kycThreshold,
                  item_name: listingData.item_name,
                },
              }),
            ]);

            return new Response(
              JSON.stringify({
                error: 'KYC verification required',
                errorCode: 'KYC_THRESHOLD_EXCEEDED',
                reason: 'listing_threshold',
                details: `Listings over €${kycThreshold} require identity verification`,
                price: listingData.price,
                priceEUR: priceInEUR.toFixed(2),
                threshold: kycThreshold,
                kycRequired: true,
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              }
            );
          }
        } catch (kycError) {
          /* KYC infrastructure is optional — never let it block a
             listing. Log and continue. */
          console.warn('KYC check skipped due to error:', kycError);
        }
      }

      /* Check if item is already listed.
         maybeSingle() returns null when 0 rows match (no throw). The
         old `.single()` raised PGRST116 in the not-listed case, which
         the destructured assignment silently swallowed BUT some
         versions of postgrest-js bubble it as a network error — using
         maybeSingle removes that footgun. */
      const { data: existingListing, error: existingError } = await supabase
        .from('marketplace_listings')
        .select('id')
        .eq('steam_id', listingData.steam_id)
        .eq('asset_id', listingData.asset_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.warn('Existing-listing check failed (continuing):', existingError.message);
      }

      if (existingListing) {
        console.log('Item already listed:', listingData.asset_id);
        return new Response(
          JSON.stringify({ error: 'This item is already listed in the marketplace' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Create listing
      const insertData: any = {
        user_id: user.id,
        steam_id: listingData.steam_id,
        asset_id: listingData.asset_id,
        market_hash_name: listingData.market_hash_name,
        item_name: listingData.item_name,
        item_type: listingData.item_type || 'Unknown',
        rarity: listingData.rarity || 'Consumer Grade',
        condition: listingData.condition || 'Factory New',
        price: listingData.price,
        image_url: listingData.image_url,
        float_value: listingData.float_value,
        pattern_template: listingData.pattern_template,
        stickers: listingData.stickers || [],
        description: listingData.description,
        listing_type: listingData.listing_type || 'standard',
        /* Persist inspect_link so the CSFloat lookup hook on the
           marketplace card can fetch real float/paint_seed data later.
           Steam's `csgo_econ_action_preview` URL contains the M/A/D
           triplet CSFloat needs — we can't reconstruct it from
           asset_id alone. */
        inspect_link: (listingData as any).inspect_link || null,
      };

      if (listingData.listing_type === 'auction') {
        insertData.auction_end_time = listingData.auction_end_time;
        insertData.minimum_bid = listingData.minimum_bid || listingData.price;
        insertData.current_bid = 0;
        insertData.bid_count = 0;
        if (listingData.buyout_price) insertData.buyout_price = listingData.buyout_price;
        if (listingData.reserve_price) insertData.reserve_price = listingData.reserve_price;
      }

      if (listingData.listing_type === 'private' && listingData.private_buyer_steam_id) {
        insertData.private_buyer_steam_id = listingData.private_buyer_steam_id;
      }

      const { data: newListing, error } = await supabase
        .from('marketplace_listings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating listing:', error);
        throw new Error(`Failed to create listing: ${error.message}`);
      }

      console.log('Listing created successfully:', newListing);

      return new Response(
        JSON.stringify({ 
          success: true, 
          listing: newListing,
          message: `${listingData.item_name} listed successfully` 
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 201 
        }
      );

    } else if (req.method === 'PUT') {
      // Update existing listing
      console.log('=== UPDATING LISTING ===');
      
      const listingId = url.searchParams.get('id');
      const steamId = url.searchParams.get('steamId');
      
      if (!listingId) {
        return new Response(
          JSON.stringify({ error: 'Listing ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'Steam ID is required for authorization' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const updateData: UpdateListingRequest = await req.json();
      
      // Verify ownership
      const { data: existingListing, error: fetchError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .eq('steam_id', steamId)
        .single();

      if (fetchError || !existingListing) {
        return new Response(
          JSON.stringify({ error: 'Listing not found or unauthorized' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Update the listing
      const { data: updatedListing, error: updateError } = await supabase
        .from('marketplace_listings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId)
        .eq('steam_id', steamId)
        .select()
        .single();

      if (updateError) {
        console.error('Database error updating listing:', updateError);
        throw new Error(`Failed to update listing: ${updateError.message}`);
      }

      console.log('Listing updated successfully:', updatedListing);

      return new Response(
        JSON.stringify({ 
          success: true, 
          listing: updatedListing,
          message: 'Listing updated successfully' 
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        }
      );

    } else if (req.method === 'DELETE') {
      // Delete/deactivate listing
      console.log('=== DELETING LISTING ===');
      
      const listingId = url.searchParams.get('id');
      const steamId = url.searchParams.get('steamId');
      
      if (!listingId) {
        return new Response(
          JSON.stringify({ error: 'Listing ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'Steam ID is required for authorization' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Verify ownership and delete
      const { data: deletedListing, error: deleteError } = await supabase
        .from('marketplace_listings')
        .delete()
        .eq('id', listingId)
        .eq('steam_id', steamId)
        .select()
        .single();

      if (deleteError) {
        console.error('Database error deleting listing:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete listing',
            details: deleteError.message 
          }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log('Listing deleted successfully:', deletedListing);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Listing deleted successfully' 
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
