import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Create notification for escrow events
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
 * Release escrow payment to seller (48-hour auto-release)
 * ONLY if payment hasn't been processed yet
 */
async function releaseEscrowPayment(
  supabase: any,
  order: any,
  releaseReason: 'auto_timeout'
) {
  console.log(`=== RELEASING ESCROW PAYMENT ===`);
  console.log(`Order: ${order.transaction_id}`);
  console.log(`Seller: ${order.seller_steam_id}`);
  console.log(`Amount: ${order.total_amount} CZK`);
  console.log(`Payment status: ${order.payment_status}`);
  console.log(`Release reason: ${releaseReason}`);

  // CRITICAL: Check if payment was already processed
  if (order.payment_status === 'completed') {
    console.log('⚠️ PAYMENT ALREADY PROCESSED - SKIPPING AUTO-RELEASE');
    return { already_processed: true };
  }

  if (order.payment_status === 'failed' || order.payment_status === 'refunded') {
    console.log('⚠️ ORDER IN INVALID STATE FOR PAYMENT');
    throw new Error(`Cannot process payment for order with payment_status: ${order.payment_status}`);
  }

  try {
    // Get seller user info for payment
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', order.seller_steam_id)
      .single();

    if (sellerError || !seller) {
      throw new Error('Seller not found for payment processing');
    }

    // Get buyer info for notifications
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('display_name')
      .eq('steam_id', order.buyer_steam_id)
      .single();

    const buyerName = buyer?.display_name || 'Buyer';

    console.log('=== CREATING SELLER PAYMENT TRANSACTION ===');

    // Create sale transaction for seller
    const saleTransaction = {
      user_id: seller.id,
      steam_id: order.seller_steam_id,
      type: 'sale',
      amount: order.total_amount,
      description: `Auto-escrow release - Order ${order.transaction_id}. 48-hour protection period completed.`,
      reference_id: `auto_release_${order.transaction_id}_${Date.now()}`,
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        order_id: order.transaction_id,
        buyer_steam_id: order.buyer_steam_id,
        buyer_name: buyerName,
        items: order.items,
        release_reason: releaseReason,
        escrow_released: true,
        payment_source: 'escrow_auto_release'
      }
    };

    const { data: saleResult, error: saleError } = await supabase
      .from('user_transactions')
      .insert(saleTransaction)
      .select()
      .single();

    if (saleError) {
      console.error('Failed to create seller payment:', saleError);
      throw new Error(`Failed to process seller payment: ${saleError.message}`);
    }

    console.log('✅ Seller payment created:', saleResult.id);

    // ATOMIC BALANCE UPDATE
    const currentBalance = Number(seller.current_balance || 0);
    const currentEarned = Number(seller.total_earned || 0);
    const newBalance = currentBalance + order.total_amount;
    const newEarned = currentEarned + order.total_amount;

    const { error: balanceError } = await supabase
      .from('users')
      .update({
        current_balance: newBalance,
        total_earned: newEarned,
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id);

    if (balanceError) {
      console.error('Failed to update seller balance:', balanceError);
      throw new Error('Failed to update seller balance');
    }

    console.log('✅ Seller balance updated');

    // Update order status - Mark payment as completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'completed',
        payment_processed_at: new Date().toISOString(),
        status: 'completed',
        completed_at: new Date().toISOString(),
        tracking_notes: `Auto-escrow release: ${releaseReason}. 48-hour protection period completed. Seller payment processed.`,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', order.transaction_id)
      .eq('payment_status', 'pending');

    if (updateError) {
      console.error('Failed to update order status:', updateError);
    }

    console.log('=== CREATING NOTIFICATIONS ===');

    // Auto-release notifications
    await createNotification(
      supabase,
      order.seller_steam_id,
      'success',
      '⏰ Payment Auto-Released!',
      `Your payment of ${order.total_amount.toLocaleString('cs-CZ')} Kč has been automatically released after 48 hours. Trade completed!`,
      `/profile?tab=orders&transaction=${order.transaction_id}`,
      {
        order_id: order.transaction_id,
        amount: order.total_amount,
        release_reason: 'auto_timeout',
        payment_received: true,
        auto_released: true
      }
    );

    await createNotification(
      supabase,
      order.buyer_steam_id,
      'info',
      '⏰ Escrow Period Completed',
      `The 48-hour protection period for order ${order.transaction_id} has expired. Seller has been paid automatically. If you didn't receive items, contact support.`,
      `/profile?tab=orders&transaction=${order.transaction_id}`,
      {
        order_id: order.transaction_id,
        items: order.items,
        auto_released: true,
        contact_support_if_issues: true
      }
    );

    console.log('=== ESCROW RELEASE COMPLETE ===');
    return { success: true };

  } catch (error) {
    console.error('Escrow release error:', error);
    throw error;
  }
}

/**
 * Check for expired escrows and release them automatically
 */
async function processExpiredEscrows(supabase: any) {
  console.log('=== CHECKING FOR EXPIRED ESCROWS ===');

  try {
    // Find orders where escrow_release_date has passed, status is pending, and payment not yet processed
    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .lte('escrow_release_date', new Date().toISOString());

    if (error) {
      console.error('Failed to fetch expired orders:', error);
      return;
    }

    console.log(`Found ${expiredOrders?.length || 0} expired escrows to process`);

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('No expired escrows found');
      return;
    }

    // Process each expired escrow
    for (const order of expiredOrders) {
      try {
        console.log(`Processing expired escrow for order: ${order.transaction_id}`);
        console.log(`Escrow was set to expire: ${order.escrow_release_date}`);
        console.log(`Current time: ${new Date().toISOString()}`);

        const result = await releaseEscrowPayment(supabase, order, 'auto_timeout');

        if (result.already_processed) {
          console.log(`⚠️ Payment already processed for order ${order.transaction_id}`);
        } else {
          console.log(`✅ Auto-released payment for order ${order.transaction_id}`);
        }

      } catch (releaseError) {
        console.error(`Failed to auto-release order ${order.transaction_id}:`, releaseError);

        // Create error notification for admin
        await createNotification(
          supabase,
          'system',
          'error',
          '❌ Auto-Release Failed',
          `Failed to auto-release escrow for order ${order.transaction_id}: ${releaseError.message}`,
          '/admin',
          {
            order_id: order.transaction_id,
            error: releaseError.message,
            requires_manual_intervention: true
          }
        );
      }
    }

    console.log('=== EXPIRED ESCROW PROCESSING COMPLETE ===');

  } catch (error) {
    console.error('Error processing expired escrows:', error);
  }
}

/**
 * Escrow Release Handler
 * Automatically releases payments after 48-hour escrow period
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
      console.log('=== PROCESSING EXPIRED ESCROWS ===');
      console.log('Current time:', new Date().toISOString());

      await processExpiredEscrows(supabase);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Expired escrow processing completed',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
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
    console.error('=== ESCROW RELEASE ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process escrow release',
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
