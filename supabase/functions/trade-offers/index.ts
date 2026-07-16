const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TradeOfferRequest {
  initiator_steam_id: string;
  recipient_steam_id: string;
  offered_items: Array<{
    asset_id: string;
    item_name: string;
    market_name: string;
    item_type: string;
    rarity: string;
    condition: string;
    market_value: number;
    image_url: string;
    float_value?: string;
    pattern_template?: string;
    stickers?: any[];
  }>;
  requested_items: Array<{
    asset_id: string;
    item_name: string;
    market_name: string;
    item_type: string;
    rarity: string;
    condition: string;
    market_value: number;
    image_url: string;
    float_value?: string;
    pattern_template?: string;
    stickers?: any[];
  }>;
  notes?: string;
}

interface AcceptTradeRequest {
  trade_offer_id: string;
  recipient_steam_id: string;
}

interface CancelTradeRequest {
  trade_offer_id: string;
  user_steam_id: string;
  cancellation_reason: string;
}

/**
 * Calculate price difference percentage between two values
 */
function calculatePriceDifference(offerValue: number, requestValue: number): number {
  if (requestValue === 0) return offerValue > 0 ? 100 : 0;
  return ((offerValue - requestValue) / requestValue) * 100;
}

/**
 * Validate that price difference is within acceptable range
 */
function validatePriceDifference(percentage: number, maxDifference: number = 15): boolean {
  return Math.abs(percentage) <= maxDifference;
}

/**
 * Create a new trade offer
 */
async function createTradeOffer(supabaseClient: any, request: TradeOfferRequest) {
  console.log('=== CREATING TRADE OFFER ===');
  console.log('Initiator:', request.initiator_steam_id);
  console.log('Recipient:', request.recipient_steam_id);
  console.log('Offered items:', request.offered_items.length);
  console.log('Requested items:', request.requested_items.length);

  // Validate different users
  if (request.initiator_steam_id === request.recipient_steam_id) {
    throw new Error('Cannot create trade offer with yourself');
  }

  // Validate items
  if (request.offered_items.length === 0 || request.requested_items.length === 0) {
    throw new Error('Trade must include at least one item on each side');
  }

  // Calculate total values
  const totalOfferValue = request.offered_items.reduce((sum, item) => sum + item.market_value, 0);
  const totalRequestValue = request.requested_items.reduce((sum, item) => sum + item.market_value, 0);

  console.log('Total offer value:', totalOfferValue);
  console.log('Total request value:', totalRequestValue);

  // Calculate price difference
  const priceDifference = calculatePriceDifference(totalOfferValue, totalRequestValue);
  console.log('Price difference:', priceDifference.toFixed(2) + '%');

  // Validate price difference (15% tolerance)
  if (!validatePriceDifference(priceDifference)) {
    throw new Error(`Price difference too large: ${priceDifference.toFixed(2)}%. Must be within 15%.`);
  }

  // Get trade URLs from users table
  const { data: initiatorUser, error: initiatorError } = await supabaseClient
    .from('users')
    .select('steam_trade_url')
    .eq('steam_id', request.initiator_steam_id)
    .maybeSingle();

  const { data: recipientUser, error: recipientError } = await supabaseClient
    .from('users')
    .select('steam_trade_url')
    .eq('steam_id', request.recipient_steam_id)
    .maybeSingle();

  if (!initiatorUser?.steam_trade_url) {
    throw new Error('Initiator must set their Steam trade URL before creating offers');
  }

  if (!recipientUser?.steam_trade_url) {
    throw new Error('Recipient must have a Steam trade URL set to receive offers');
  }

  // Create trade offer
  const { data: tradeOffer, error: offerError } = await supabaseClient
    .from('trade_offers')
    .insert({
      initiator_steam_id: request.initiator_steam_id,
      recipient_steam_id: request.recipient_steam_id,
      offered_items: request.offered_items,
      requested_items: request.requested_items,
      total_offer_value: totalOfferValue,
      total_request_value: totalRequestValue,
      price_difference_percentage: priceDifference,
      initiator_trade_url: initiatorUser.steam_trade_url,
      recipient_trade_url: recipientUser.steam_trade_url,
      notes: request.notes || '',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (offerError) {
    console.error('Error creating trade offer:', offerError);
    throw new Error('Failed to create trade offer: ' + offerError.message);
  }

  console.log('Trade offer created:', tradeOffer.id);

  // Insert trade items
  const itemsToInsert = [
    ...request.offered_items.map(item => ({
      trade_offer_id: tradeOffer.id,
      side: 'offer',
      ...item,
    })),
    ...request.requested_items.map(item => ({
      trade_offer_id: tradeOffer.id,
      side: 'request',
      ...item,
    })),
  ];

  const { error: itemsError } = await supabaseClient
    .from('trade_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error inserting trade items:', itemsError);
    // Rollback trade offer
    await supabaseClient
      .from('trade_offers')
      .delete()
      .eq('id', tradeOffer.id);
    throw new Error('Failed to insert trade items: ' + itemsError.message);
  }

  // Create notification for recipient
  await supabaseClient
    .from('trade_notifications')
    .insert({
      trade_offer_id: tradeOffer.id,
      user_steam_id: request.recipient_steam_id,
      notification_type: 'offer_received',
      title: 'New Trade Offer',
      message: `You received a trade offer from ${request.initiator_steam_id}`,
      metadata: {
        offer_value: totalOfferValue,
        request_value: totalRequestValue,
        price_difference: priceDifference,
      },
    });

  console.log('Trade offer created successfully');

  return {
    success: true,
    trade_offer: tradeOffer,
    message: 'Trade offer created successfully',
  };
}

/**
 * Accept a trade offer
 */
async function acceptTradeOffer(supabaseClient: any, request: AcceptTradeRequest) {
  console.log('=== ACCEPTING TRADE OFFER ===');
  console.log('Trade offer ID:', request.trade_offer_id);
  console.log('Recipient:', request.recipient_steam_id);

  // Get trade offer
  const { data: tradeOffer, error: offerError } = await supabaseClient
    .from('trade_offers')
    .select('*')
    .eq('id', request.trade_offer_id)
    .maybeSingle();

  if (offerError || !tradeOffer) {
    throw new Error('Trade offer not found');
  }

  // Validate recipient
  if (tradeOffer.recipient_steam_id !== request.recipient_steam_id) {
    throw new Error('Only the recipient can accept this trade offer');
  }

  // Validate status
  if (tradeOffer.status !== 'pending') {
    throw new Error(`Cannot accept trade offer with status: ${tradeOffer.status}`);
  }

  // Check if expired
  if (new Date(tradeOffer.expires_at) < new Date()) {
    // Update to expired
    await supabaseClient
      .from('trade_offers')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', request.trade_offer_id);
    throw new Error('Trade offer has expired');
  }

  // Update trade offer status
  const { error: updateError } = await supabaseClient
    .from('trade_offers')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.trade_offer_id);

  if (updateError) {
    throw new Error('Failed to accept trade offer: ' + updateError.message);
  }

  // Create notifications
  await supabaseClient
    .from('trade_notifications')
    .insert([
      {
        trade_offer_id: request.trade_offer_id,
        user_steam_id: tradeOffer.initiator_steam_id,
        notification_type: 'offer_accepted',
        title: 'Trade Offer Accepted',
        message: `Your trade offer was accepted! You can now send the items via Steam.`,
        metadata: {
          recipient: request.recipient_steam_id,
          trade_url: tradeOffer.recipient_trade_url,
        },
      },
      {
        trade_offer_id: request.trade_offer_id,
        user_steam_id: request.recipient_steam_id,
        notification_type: 'offer_accepted',
        title: 'Trade Offer Accepted',
        message: `You accepted the trade offer. Waiting for items to be sent.`,
        metadata: {
          initiator: tradeOffer.initiator_steam_id,
        },
      },
    ]);

  console.log('Trade offer accepted successfully');

  return {
    success: true,
    trade_offer: {
      ...tradeOffer,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    },
    message: 'Trade offer accepted successfully',
    next_step: 'initiator_sends_items',
  };
}

/**
 * Cancel a trade offer
 */
async function cancelTradeOffer(supabaseClient: any, request: CancelTradeRequest) {
  console.log('=== CANCELLING TRADE OFFER ===');
  console.log('Trade offer ID:', request.trade_offer_id);
  console.log('User:', request.user_steam_id);

  // Get trade offer
  const { data: tradeOffer, error: offerError } = await supabaseClient
    .from('trade_offers')
    .select('*')
    .eq('id', request.trade_offer_id)
    .maybeSingle();

  if (offerError || !tradeOffer) {
    throw new Error('Trade offer not found');
  }

  // Validate user can cancel
  if (
    tradeOffer.initiator_steam_id !== request.user_steam_id &&
    tradeOffer.recipient_steam_id !== request.user_steam_id
  ) {
    throw new Error('Only parties involved in the trade can cancel it');
  }

  // Validate status - can only cancel pending or accepted trades
  if (!['pending', 'accepted'].includes(tradeOffer.status)) {
    throw new Error(`Cannot cancel trade with status: ${tradeOffer.status}`);
  }

  // Update trade offer status
  const { error: updateError } = await supabaseClient
    .from('trade_offers')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: request.cancellation_reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.trade_offer_id);

  if (updateError) {
    throw new Error('Failed to cancel trade offer: ' + updateError.message);
  }

  // Create notifications for both parties
  const otherParty =
    request.user_steam_id === tradeOffer.initiator_steam_id
      ? tradeOffer.recipient_steam_id
      : tradeOffer.initiator_steam_id;

  await supabaseClient
    .from('trade_notifications')
    .insert([
      {
        trade_offer_id: request.trade_offer_id,
        user_steam_id: otherParty,
        notification_type: 'offer_cancelled',
        title: 'Trade Offer Cancelled',
        message: `The trade offer was cancelled. Reason: ${request.cancellation_reason}`,
        metadata: {
          cancelled_by: request.user_steam_id,
          reason: request.cancellation_reason,
        },
      },
    ]);

  console.log('Trade offer cancelled successfully');

  return {
    success: true,
    message: 'Trade offer cancelled successfully',
  };
}

/**
 * Get trade offers for a user
 */
async function getTradeOffers(supabaseClient: any, steamId: string, filter?: string) {
  console.log('=== FETCHING TRADE OFFERS ===');
  console.log('Filter:', filter);

  /* SECURITY: steamId is interpolated into a PostgREST .or() filter, so a
     non-numeric value could inject extra filter clauses and read other
     users' offers. A Steam ID64 is exactly 17 digits — reject anything
     else before it reaches the query string. */
  if (!/^\d{17}$/.test(String(steamId))) {
    throw new Error('Invalid steamId');
  }

  let query = supabaseClient
    .from('trade_offers')
    .select(`
      *,
      trade_items(*)
    `)
    .or(`initiator_steam_id.eq.${steamId},recipient_steam_id.eq.${steamId}`)
    .order('created_at', { ascending: false });

  if (filter && filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch trade offers: ' + error.message);
  }

  console.log(`Found ${data.length} trade offers`);

  return {
    success: true,
    trade_offers: data,
  };
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'GET') {
      const steamId = url.searchParams.get('steamId');
      const filter = url.searchParams.get('filter') || 'all';

      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steamId parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await getTradeOffers(supabaseClient, steamId, filter);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'create') {
        const result = await createTradeOffer(supabaseClient, body);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'accept') {
        const result = await acceptTradeOffer(supabaseClient, body);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'cancel') {
        const result = await cancelTradeOffer(supabaseClient, body);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Trade offers error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
