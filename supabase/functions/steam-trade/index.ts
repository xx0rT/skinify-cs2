import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface CreateTradeOfferRequest {
  transaction_id: string;
  seller_steam_id: string;
  buyer_steam_id: string;
  items: Array<{
    asset_id: string;
    name: string;
    market_name: string;
  }>;
}

/**
 * Create notification for trade events
 */
async function createNotification(
  supabase: any,
  userSteamId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: any
) {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_steam_id: userSteamId,
        type,
        title,
        message,
        action_url: actionUrl,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
    } else {
      console.log('Notification created:', data.id);
    }

    return data;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
}

/**
 * Steam Trade Handler
 * Provides trade URLs and tracks trade initiation
 * Does NOT process payments - that's handled by orders/confirm-receipt
 */
Deno.serve(async (req) => {
  console.log('=== STEAM TRADE REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
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
      console.log('=== POST REQUEST - CREATING STEAM TRADE ===');

      const tradeRequest: CreateTradeOfferRequest = await req.json();
      console.log('Trade request received:', {
        transaction_id: tradeRequest.transaction_id,
        seller: tradeRequest.seller_steam_id,
        buyer: tradeRequest.buyer_steam_id,
        items_count: tradeRequest.items.length
      });

      // Validate required fields
      if (!tradeRequest.transaction_id || !tradeRequest.seller_steam_id || !tradeRequest.buyer_steam_id || !tradeRequest.items.length) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: transaction_id, seller_steam_id, buyer_steam_id, items'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Get order details for validation
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', tradeRequest.transaction_id)
        .single();

      if (orderError || !order) {
        console.error('Order not found:', orderError);
        throw new Error('Order not found');
      }

      // Get buyer's trade link
      const { data: buyer, error: buyerError } = await supabase
        .from('users')
        .select('trade_link, display_name')
        .eq('steam_id', tradeRequest.buyer_steam_id)
        .single();

      if (buyerError || !buyer) {
        return new Response(
          JSON.stringify({
            error: 'Buyer not found in database'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (!buyer.trade_link) {
        return new Response(
          JSON.stringify({
            error: 'Buyer has not set their Steam trade link'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Verify seller is authorized
      // For multi-seller orders, check if seller owns any items in the order
      const isMultiSeller = order.seller_steam_id === 'multiple_sellers';

      if (isMultiSeller) {
        // Check if this seller has items in the order
        const sellerHasItems = order.items.some((item: any) => item.seller_steam_id === tradeRequest.seller_steam_id);

        if (!sellerHasItems) {
          return new Response(
            JSON.stringify({ error: 'Not authorized - you have no items in this order' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
          );
        }

        console.log(`✅ Multi-seller order - seller ${tradeRequest.seller_steam_id} verified`);
      } else {
        // Single seller order - must match exactly
        if (order.seller_steam_id !== tradeRequest.seller_steam_id) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to create trade offer for this order' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
          );
        }
      }

      console.log('✅ Trade request validated');

      // Filter items to only include items from this seller
      const sellerItems = order.items.filter((item: any) => item.seller_steam_id === tradeRequest.seller_steam_id);

      console.log(`Seller ${tradeRequest.seller_steam_id} sending ${sellerItems.length} items`);

      // Update order tracking notes (append for multi-seller)
      const existingNotes = order.tracking_notes || '';
      const newNote = isMultiSeller
        ? `${existingNotes}\n[${new Date().toISOString()}] Seller ${tradeRequest.seller_steam_id} initiated trade for ${sellerItems.length} item(s).`
        : 'Seller initiated Steam trade. Waiting for buyer confirmation.';

      await supabase
        .from('orders')
        .update({
          items_sent_at: new Date().toISOString(),
          tracking_notes: newNote,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', tradeRequest.transaction_id);

      // Notify buyer about trade
      const itemsText = isMultiSeller
        ? `One of the sellers is sending you ${sellerItems.length} item(s) via Steam trade.`
        : `The seller is sending you a Steam trade offer.`;

      await createNotification(
        supabase,
        tradeRequest.buyer_steam_id,
        'info',
        '📦 Trade Offer Incoming!',
        `${itemsText} Please check your Steam and accept the trade when you receive it.`,
        `/profile?tab=orders&transaction=${tradeRequest.transaction_id}`,
        {
          order_id: tradeRequest.transaction_id,
          items: sellerItems,
          seller_steam_id: tradeRequest.seller_steam_id,
          multi_seller_order: isMultiSeller,
          action_required: 'accept_steam_trade'
        }
      );

      // Return trade URL for direct navigation
      return new Response(
        JSON.stringify({
          success: true,
          trade_url: buyer.trade_link,
          buyer_name: buyer.display_name,
          buyer_steam_id: tradeRequest.buyer_steam_id,
          direct_navigation: true,
          message: 'Trade link ready - opening Steam',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'GET') {
      // Check trade status
      const transactionId = url.searchParams.get('transaction_id');

      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: 'transaction_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      return new Response(
        JSON.stringify({
          transaction_id: transactionId,
          status: order.status,
          payment_status: order.payment_status,
          trade_verified: order.trade_verified,
          items_sent_at: order.items_sent_at,
          escrow_release_date: order.escrow_release_date,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        method: req.method,
        supported_methods: ['GET', 'POST', 'OPTIONS']
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'GET, POST, OPTIONS',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('=== STEAM TRADE ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process Steam trade request',
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
