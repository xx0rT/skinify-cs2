import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Create notification for users
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
}

/**
 * Steam Trade Webhook Handler
 * ONLY verifies trades and updates order status
 * Does NOT process payments (handled by orders/confirm-receipt)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log('=== STEAM TRADE WEBHOOK RECEIVED ===');

      const webhookData = await req.json();
      console.log('Webhook data:', webhookData);

      const {
        transaction_id,
        trade_success,
        seller_steam_id,
        buyer_steam_id,
        verification_source,
        asset_ids
      } = webhookData;

      if (!transaction_id || !seller_steam_id || !buyer_steam_id) {
        return new Response(
          JSON.stringify({
            error: 'Missing required webhook data: transaction_id, seller_steam_id, buyer_steam_id'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', transaction_id)
        .single();

      if (orderError || !order) {
        console.error('Order not found for webhook:', transaction_id);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (trade_success) {
        console.log('✅ TRADE SUCCESS CONFIRMED BY WEBHOOK - UPDATING ORDER STATUS');

        // Update order to mark trade as verified
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            trade_verified: true,
            items_sent_at: new Date().toISOString(),
            tracking_notes: `Trade verified via webhook from ${verification_source}. Items sent successfully.`,
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', transaction_id);

        if (updateError) {
          console.error('Failed to update order:', updateError);
        } else {
          console.log('✅ Order updated with trade verification');
        }

        // Notify buyer that items were sent
        await createNotification(
          supabase,
          buyer_steam_id,
          'success',
          '📦 Items Sent!',
          `The seller has sent your items via Steam trade. Please check your Steam inventory and confirm receipt when you receive them.`,
          `/profile?tab=orders&transaction=${transaction_id}`,
          {
            order_id: transaction_id,
            items: order.items,
            trade_verified: true,
            action_required: 'confirm_receipt'
          }
        );

        // Notify seller
        await createNotification(
          supabase,
          seller_steam_id,
          'info',
          '✅ Trade Verified',
          `Your trade for order ${transaction_id} has been verified. Waiting for buyer confirmation to release payment.`,
          `/profile?tab=orders&transaction=${transaction_id}`,
          {
            order_id: transaction_id,
            trade_verified: true,
            payment_pending_confirmation: true
          }
        );

        return new Response(
          JSON.stringify({
            success: true,
            trade_verified: true,
            transaction_id: transaction_id,
            message: 'Trade verification recorded. Payment will be processed when buyer confirms receipt.'
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else {
        console.log('❌ Trade failed or cancelled');

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'disputed',
            tracking_notes: 'Trade failed or cancelled according to webhook',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', transaction_id);

        // Notify parties about trade failure
        await createNotification(
          supabase,
          seller_steam_id,
          'warning',
          '⚠️ Trade Issue',
          `There was an issue with the trade for order ${transaction_id}. Please check Steam and contact support if needed.`,
          `/profile?tab=orders&transaction=${transaction_id}`
        );

        await createNotification(
          supabase,
          buyer_steam_id,
          'warning',
          '⚠️ Trade Issue',
          `There was an issue with the trade for order ${transaction_id}. Please contact support for assistance.`,
          `/profile?tab=orders&transaction=${transaction_id}`
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Trade failure recorded'
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('=== STEAM TRADE WEBHOOK ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process trade webhook',
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
