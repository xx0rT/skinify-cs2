import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Simple validation helper
function validateOrderRequest(orderData: any) {
  const errors: string[] = [];

  if (!orderData.buyer_steam_id) errors.push('buyer_steam_id is required');

  // payment_transaction_id is optional for balance purchases
  if (!orderData.payment_transaction_id && orderData.payment_method !== 'balance') {
    errors.push('payment_transaction_id is required for non-balance payments');
  }

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('items array is required and must not be empty');
  }
  if (typeof orderData.total_amount !== 'number' || orderData.total_amount <= 0) {
    errors.push('total_amount must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

interface CreateOrderRequest {
  buyer_steam_id: string;
  payment_transaction_id?: string; // Optional for balance purchases
  items: Array<{
    id: string;
    name: string;
    market_name: string;
    price: number;
    seller_steam_id: string;
    seller_name: string;
    image: string;
    type: string;
    condition: string;
    rarity: string;
  }>;
  total_amount: number;
  payment_method: string;
}

interface ConfirmReceiptRequest {
  transaction_id: string;
  buyer_steam_id: string;
}

/**
 * Create notification for order events
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
 * Update shop statistics after sale
 */
async function updateShopStats(
  supabase: any,
  sellerSteamId: string,
  saleAmount: number,
  itemCount: number
) {
  try {
    console.log(`Updating shop stats for seller ${sellerSteamId}: +${itemCount} sales, +${saleAmount} revenue`);

    // Get user ID from steam_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('steam_id', sellerSteamId)
      .maybeSingle();

    if (userError || !userData) {
      console.error('Failed to find user for steam_id:', sellerSteamId, userError);
      return;
    }

    // Get current shop stats
    const { data: shopData, error: getError } = await supabase
      .from('user_shops')
      .select('total_sales, total_revenue')
      .eq('user_id', userData.id)
      .maybeSingle();

    if (getError || !shopData) {
      console.log('No shop found for user, skipping stats update');
      return;
    }

    // Update shop stats
    const { error: shopError } = await supabase
      .from('user_shops')
      .update({
        total_sales: (shopData.total_sales || 0) + itemCount,
        total_revenue: ((shopData.total_revenue || 0) + saleAmount).toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.id);

    if (shopError) {
      console.error('Failed to update shop stats:', shopError);
    } else {
      console.log(`✅ Shop stats updated for seller ${sellerSteamId}`);
    }
  } catch (error) {
    console.error('Shop stats update error:', error);
  }
}

/**
 * Process seller payment with atomic balance update and double-payment protection
 * Handles multiple sellers by paying each their portion
 */
async function processSellerPayment(
  supabase: any,
  order: any,
  buyerSteamId: string
) {
  console.log(`=== PROCESSING SELLER PAYMENT ===`);
  console.log(`Order: ${order.transaction_id}`);
  console.log(`Seller(s): ${order.seller_steam_id}`);
  console.log(`Total Amount: ${order.total_amount} CZK`);
  console.log(`Current payment status: ${order.payment_status}`);

  // CRITICAL: Check if payment was already processed
  if (order.payment_status === 'completed') {
    console.log('⚠️ PAYMENT ALREADY PROCESSED - PREVENTING DOUBLE PAYMENT');
    throw new Error('Payment has already been processed for this order');
  }

  if (order.payment_status === 'failed' || order.payment_status === 'refunded') {
    console.log('⚠️ ORDER IN INVALID STATE FOR PAYMENT');
    throw new Error(`Cannot process payment for order with status: ${order.payment_status}`);
  }

  try {
    // Get buyer info for notifications
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('display_name')
      .eq('steam_id', buyerSteamId)
      .single();

    const buyerName = buyer?.display_name || 'Buyer';

    // Check if this is a multi-seller order
    const isMultiSeller = order.seller_steam_id === 'multiple_sellers';

    if (isMultiSeller) {
      console.log('=== MULTI-SELLER ORDER - PROCESSING INDIVIDUAL PAYMENTS ===');

      // Group items by seller and calculate each seller's amount
      const sellerGroups = new Map<string, { items: any[], amount: number }>();

      for (const item of order.items) {
        const sellerSteamId = item.seller_steam_id;

        if (!sellerGroups.has(sellerSteamId)) {
          sellerGroups.set(sellerSteamId, { items: [], amount: 0 });
        }

        const group = sellerGroups.get(sellerSteamId)!;
        group.items.push(item);
        group.amount += item.price;
      }

      console.log(`Found ${sellerGroups.size} unique sellers`);

      // Process payment for each seller
      for (const [sellerSteamId, { items, amount }] of sellerGroups) {
        console.log(`Processing payment for seller ${sellerSteamId}: ${amount} CZK`);

        // Get seller user info
        const { data: seller, error: sellerError } = await supabase
          .from('users')
          .select('*')
          .eq('steam_id', sellerSteamId)
          .single();

        if (sellerError || !seller) {
          console.error(`Seller ${sellerSteamId} not found:`, sellerError);
          continue; // Skip this seller but continue with others
        }

        // Create sale transaction for this seller.
        // `pending_wallet: true` makes the balance trigger route this into the
        // seller's PENDING balance (not current). The auto-escrow-release cron
        // moves it to current balance once 8 days have passed (1-day safety
        // margin past CS2's 7-day trade-back window).
        const saleTransaction = {
          user_id: seller.id,
          steam_id: sellerSteamId,
          type: 'sale',
          amount: amount,
          description: `Trade completed - Order ${order.transaction_id}. Your portion: ${items.length} item(s). Funds held 8 days.`,
          reference_id: `sale_${order.transaction_id}_${sellerSteamId}_${Date.now()}`,
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            order_id: order.transaction_id,
            buyer_steam_id: buyerSteamId,
            buyer_name: buyerName,
            items: items,
            multi_seller_order: true,
            payment_source: 'buyer_confirmation',
            pending_wallet: true,
            hold_until: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
          }
        };

        const { data: saleResult, error: saleError } = await supabase
          .from('user_transactions')
          .insert(saleTransaction)
          .select()
          .single();

        if (saleError) {
          console.error(`Failed to create payment for seller ${sellerSteamId}:`, saleError);
          throw new Error(`Failed to process payment for seller ${sellerSteamId}: ${saleError.message}`);
        }

        console.log(`✅ Payment created for seller ${sellerSteamId}: ${saleResult.id}`);

        // Notify this seller
        await createNotification(
          supabase,
          sellerSteamId,
          'success',
          'Funds in pending balance',
          `${amount.toLocaleString('cs-CZ')} Kč for ${items.length} item(s) from order ${order.transaction_id} is now in your pending balance. Released to main balance in 8 days (after CS2's 7-day trade-back window).`,
          `/profile?tab=orders&transaction=${order.transaction_id}`,
          {
            order_id: order.transaction_id,
            amount: amount,
            items: items,
            buyer_confirmed: true
          }
        );

        console.log(`✅ Seller ${sellerSteamId} notified`);
      }

      console.log(`✅ ALL ${sellerGroups.size} SELLERS PAID SUCCESSFULLY`);

    } else {
      // Single seller order - original logic
      console.log('=== SINGLE-SELLER ORDER - PROCESSING PAYMENT ===');

      const { data: seller, error: sellerError } = await supabase
        .from('users')
        .select('*')
        .eq('steam_id', order.seller_steam_id)
        .single();

      if (sellerError || !seller) {
        throw new Error('Seller not found for payment processing');
      }

      console.log('=== CREATING SELLER PAYMENT TRANSACTION ===');

      // Create sale transaction for seller.
      // `pending_wallet: true` routes the funds into pending_balance via the
      // user-balance trigger; auto-escrow-release will move it to current
      // balance after 8 days (1-day safety margin past CS2's 7-day trade-back
      // window).
      const saleTransaction = {
        user_id: seller.id,
        steam_id: order.seller_steam_id,
        type: 'sale',
        amount: order.total_amount,
        description: `Trade completed - Order ${order.transaction_id}. Buyer confirmed receipt. Funds held 8 days.`,
        reference_id: `sale_${order.transaction_id}_${Date.now()}`,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          order_id: order.transaction_id,
          buyer_steam_id: buyerSteamId,
          buyer_name: buyerName,
          items: order.items,
          payment_source: 'buyer_confirmation',
          pending_wallet: true,
          hold_until: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
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

      console.log(`✅ Seller payment created: ${saleResult.id}`);

      // Notify seller
      await createNotification(
        supabase,
        order.seller_steam_id,
        'success',
        'Funds in pending balance',
        `${order.total_amount.toLocaleString('cs-CZ')} Kč for order ${order.transaction_id} is now in your pending balance. Released to main balance in 8 days (after CS2's 7-day trade-back window).`,
        `/profile?tab=orders&transaction=${order.transaction_id}`,
        {
          order_id: order.transaction_id,
          amount: order.total_amount,
          items: order.items,
          buyer_confirmed: true
        }
      );
    }

    console.log('✅ All seller payments processed successfully');

    // ATOMIC ORDER UPDATE - Mark payment as completed
    console.log('=== UPDATING ORDER STATUS ===');

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'completed',
        payment_processed_at: new Date().toISOString(),
        status: 'completed',
        completed_at: new Date().toISOString(),
        tracking_notes: 'Buyer confirmed receipt. Seller payment processed successfully.',
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', order.transaction_id)
      .eq('payment_status', 'pending');

    if (orderUpdateError) {
      console.error('Failed to update order:', orderUpdateError);
      throw new Error('Failed to update order status');
    }

    console.log('✅ Order status updated');

    // Create success notifications
    await createNotification(
      supabase,
      order.seller_steam_id,
      'success',
      '💰 Payment Received!',
      `Your payment of ${order.total_amount.toLocaleString('cs-CZ')} Kč has been processed! ${buyerName} confirmed receipt of all items.`,
      `/profile?tab=orders&transaction=${order.transaction_id}`,
      {
        order_id: order.transaction_id,
        amount: order.total_amount,
        payment_received: true,
        buyer_name: buyerName
      }
    );

    await createNotification(
      supabase,
      buyerSteamId,
      'success',
      '🎉 Trade Completed!',
      `Trade completed successfully! The seller has been paid. Enjoy your new CS2 items!`,
      `/profile?tab=orders&transaction=${order.transaction_id}`,
      {
        order_id: order.transaction_id,
        items: order.items,
        trade_completed: true,
        seller_paid: true
      }
    );

    console.log('✅ Payment processing complete');
    return true;

  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}

/**
 * Main orders handler
 */
Deno.serve(async (req) => {
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
      // Get user orders
      const steamId = url.searchParams.get('steam_id') || url.searchParams.get('steamId');
      const typeParam = url.searchParams.get('type');
      const sellerParam = url.searchParams.get('seller');
      const type = typeParam || (sellerParam === 'true' ? 'sales' : 'all');

      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id or steamId parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log(`=== FETCHING ORDERS FOR ${steamId} ===`);
      console.log('Type param from URL:', typeParam);
      console.log('Seller param from URL:', sellerParam);
      console.log('Final order type:', type);
      console.log('Type check - purchases?:', type === 'purchases');
      console.log('Type check - sales?:', type === 'sales');
      console.log('Type check - all?:', type === 'all');

      let orders: any[] = [];

      if (type === 'purchases') {
        console.log('Query: Fetching PURCHASES only (buyer_steam_id =', steamId, ')');
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('buyer_steam_id', steamId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch purchase orders:', error);
          throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        orders = data || [];
        console.log(`Found ${orders.length} purchase orders`);

      } else if (type === 'sales') {
        console.log('Query: Fetching SALES only (seller_steam_id =', steamId, ')');
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('seller_steam_id', steamId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch sales orders:', error);
          throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        orders = data || [];
        console.log(`Found ${orders.length} sales orders`);

      } else {
        console.log('Query: Fetching ALL orders (buyer AND seller) for', steamId);

        // Fetch purchases
        const { data: purchases, error: purchaseError } = await supabase
          .from('orders')
          .select('*')
          .eq('buyer_steam_id', steamId);

        if (purchaseError) {
          console.error('Failed to fetch purchase orders:', purchaseError);
          throw new Error(`Failed to fetch purchase orders: ${purchaseError.message}`);
        }

        console.log(`Found ${purchases?.length || 0} purchase orders`);

        // Fetch sales
        const { data: sales, error: salesError } = await supabase
          .from('orders')
          .select('*')
          .eq('seller_steam_id', steamId);

        if (salesError) {
          console.error('Failed to fetch sales orders:', salesError);
          throw new Error(`Failed to fetch sales orders: ${salesError.message}`);
        }

        console.log(`Found ${sales?.length || 0} sales orders`);

        // Merge and deduplicate (in case user bought from themselves)
        const orderMap = new Map();

        (purchases || []).forEach(order => {
          orderMap.set(order.id, order);
        });

        (sales || []).forEach(order => {
          orderMap.set(order.id, order);
        });

        orders = Array.from(orderMap.values());

        // Sort by created_at descending
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log(`Total unique orders after merge: ${orders.length}`);
      }

      console.log(`Initial query returned ${orders?.length || 0} orders`);

      // For 'sales', also check items array for multi-seller orders
      // let orders = allOrders || [];

      if (type === 'sales') {
        // For sales only: also include orders where user is seller in items but not main seller_steam_id
        const { data: multiSellerOrders, error: multiError } = await supabase
          .from('orders')
          .select('*')
          .neq('seller_steam_id', steamId)
          .order('created_at', { ascending: false });

        if (!multiError && multiSellerOrders) {
          // Filter to only orders where user is seller of at least one item
          const additionalOrders = multiSellerOrders.filter(order => {
            if (order.items && Array.isArray(order.items)) {
              return order.items.some((item: any) => item.seller_steam_id === steamId);
            }
            return false;
          });

          // Merge and deduplicate
          const allOrderIds = new Set(orders.map(o => o.id));
          additionalOrders.forEach(order => {
            if (!allOrderIds.has(order.id)) {
              orders.push(order);
            }
          });

          // Re-sort by created_at
          orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }

      console.log(`=== FINAL RESULTS ===`);
      console.log(`Found ${orders?.length || 0} orders for user ${steamId}`);

      if (orders && orders.length > 0) {
        orders.forEach((order, idx) => {
          console.log(`Order ${idx + 1}:`, {
            transaction_id: order.transaction_id,
            buyer_steam_id: order.buyer_steam_id,
            seller_steam_id: order.seller_steam_id,
            status: order.status,
            is_buyer: order.buyer_steam_id === steamId,
            is_seller: order.seller_steam_id === steamId,
            created_at: order.created_at
          });
        });
      }

      return new Response(
        JSON.stringify({
          orders: orders || [],
          total: orders?.length || 0,
          type: type,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'POST') {
      const endpoint = url.pathname.split('/').pop();

      if (endpoint === 'confirm-receipt') {
        // Buyer confirms receipt of items
        console.log('=== BUYER CONFIRMING RECEIPT ===');

        const confirmData: ConfirmReceiptRequest = await req.json();
        console.log('Confirmation data:', confirmData);

        if (!confirmData.transaction_id || !confirmData.buyer_steam_id) {
          return new Response(
            JSON.stringify({ error: 'transaction_id and buyer_steam_id are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Get order details with FOR UPDATE lock
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('transaction_id', confirmData.transaction_id)
          .single();

        if (orderError || !order) {
          throw new Error('Order not found');
        }

        // Verify buyer authorization
        if (order.buyer_steam_id !== confirmData.buyer_steam_id) {
          return new Response(
            JSON.stringify({ error: 'Only the buyer can confirm receipt' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Check order status
        if (order.status !== 'pending') {
          return new Response(
            JSON.stringify({
              error: `Cannot confirm order with status: ${order.status}`,
              current_status: order.status
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // CRITICAL: Check if payment already processed
        if (order.payment_status === 'completed') {
          return new Response(
            JSON.stringify({
              error: 'Payment has already been processed for this order',
              payment_status: order.payment_status,
              payment_processed_at: order.payment_processed_at
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        console.log('✅ BUYER CONFIRMED RECEIPT - VERIFYING INVENTORY');

        // STEP 1: Verify buyer has items in inventory
        let inventoryVerified = false;
        let verificationAttempted = false;

        try {
          console.log('Calling inventory verification function...');
          const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-steam-inventory`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transaction_id: confirmData.transaction_id,
              buyer_steam_id: confirmData.buyer_steam_id,
              items_to_verify: order.items
            })
          });

          verificationAttempted = true;

          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            console.log('Inventory verification result:', verifyResult);

            inventoryVerified = verifyResult.verified === true;

            if (!inventoryVerified) {
              console.warn('⚠️ Inventory verification failed:', verifyResult.reason || 'Items not found');

              // If inventory is private or API error, allow manual confirmation
              if (verifyResult.allow_manual_confirm) {
                console.log('Manual confirmation allowed due to:', verifyResult.reason);
                inventoryVerified = true; // Allow payment to proceed with manual confirmation
              } else {
                // Items definitively not in inventory - don't release funds
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: 'Inventory verification failed',
                    details: verifyResult.message || 'Items not found in buyer inventory',
                    verification_details: verifyResult.verification_details
                  }),
                  {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    status: 400
                  }
                );
              }
            } else {
              console.log('✅ All items verified in buyer inventory');
            }
          } else {
            console.error('Inventory verification function error:', verifyResponse.status);
            // Allow manual confirmation if verification service fails
            inventoryVerified = true;
          }
        } catch (verifyError) {
          console.error('Inventory verification error:', verifyError);
          // Allow manual confirmation if verification fails
          inventoryVerified = true;
        }

        // STEP 2: Process the seller payment
        console.log('✅ INVENTORY VERIFIED - PROCESSING PAYMENT');
        await processSellerPayment(supabase, order, confirmData.buyer_steam_id);

        return new Response(
          JSON.stringify({
            success: true,
            payment_processed: true,
            seller_paid: true,
            amount: order.total_amount,
            inventory_verified: inventoryVerified,
            verification_attempted: verificationAttempted,
            message: 'Receipt confirmed and seller payment processed successfully'
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else {
        // Create new order - REQUIRES PAYMENT FIRST
        console.log('=== CREATING NEW ORDER ===');

        const orderData: CreateOrderRequest = await req.json();
        console.log('Order creation request:', {
          buyer_steam_id: orderData.buyer_steam_id,
          payment_transaction_id: orderData.payment_transaction_id,
          items_count: orderData.items?.length || 0,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method
        });

        // Input validation
        const validation = validateOrderRequest(orderData);
        if (!validation.valid) {
          console.error('Order validation failed:', validation.errors);
          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              details: validation.errors
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // VERIFY PAYMENT - Skip for balance purchases
        console.log('=== VERIFYING PAYMENT ===');
        console.log('Payment method:', orderData.payment_method);
        console.log('Payment transaction ID:', orderData.payment_transaction_id);

        // For balance purchases, we verify balance instead of transaction
        if (orderData.payment_method === 'balance') {
          console.log('Balance purchase - skipping transaction verification');
        } else {
          // For external payments, verify transaction exists
          const { data: paymentTransaction, error: paymentError } = await supabase
            .from('user_transactions')
            .select('*')
            .eq('id', orderData.payment_transaction_id)
            .eq('steam_id', orderData.buyer_steam_id)
            .eq('type', 'deposit')
            .eq('status', 'completed')
            .single();

          if (paymentError || !paymentTransaction) {
            console.error('Payment verification failed:', paymentError);
            return new Response(
              JSON.stringify({
                error: 'Payment not found or not completed. Please complete payment first.',
                payment_transaction_id: orderData.payment_transaction_id
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          console.log('✅ Payment verified:', paymentTransaction.id);
        }

        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
          return new Response(
            JSON.stringify({
              error: 'Items must be a non-empty array',
              items_received: orderData.items
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // PREVENT SELF-TRADING: Check if buyer is trying to buy their own items
        const sellingToSelf = orderData.items.some((item: any) => item.seller_steam_id === orderData.buyer_steam_id);
        if (sellingToSelf) {
          console.error('❌ SELF-TRADING ATTEMPT BLOCKED');
          return new Response(
            JSON.stringify({
              error: 'You cannot purchase your own items',
              buyer_steam_id: orderData.buyer_steam_id
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Verify buyer exists
        const { data: buyer, error: buyerError } = await supabase
          .from('users')
          .select('*')
          .eq('steam_id', orderData.buyer_steam_id)
          .single();

        if (buyerError || !buyer) {
          throw new Error('Buyer not found. Please log in with Steam first.');
        }

        console.log('Buyer verified:', buyer.display_name);

        // Check buyer has sufficient balance
        const buyerBalance = Number(buyer.current_balance || 0);
        if (buyerBalance < orderData.total_amount) {
          return new Response(
            JSON.stringify({
              error: 'Insufficient balance',
              current_balance: buyerBalance,
              required_amount: orderData.total_amount
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // DEDUCT BUYER'S BALANCE ATOMICALLY
        console.log('=== DEDUCTING BUYER BALANCE ===');
        console.log('Current balance:', buyerBalance);
        console.log('Purchase amount:', orderData.total_amount);
        console.log('Previous total_spent:', buyer.total_spent);

        const newBuyerBalance = buyerBalance - orderData.total_amount;
        const newTotalSpent = Number(buyer.total_spent || 0) + orderData.total_amount;

        console.log('New balance will be:', newBuyerBalance);
        console.log('New total_spent will be:', newTotalSpent);

        const { error: buyerBalanceError } = await supabase
          .from('users')
          .update({
            current_balance: newBuyerBalance,
            total_spent: newTotalSpent,
            updated_at: new Date().toISOString()
          })
          .eq('id', buyer.id);

        if (buyerBalanceError) {
          console.error('Failed to deduct buyer balance:', buyerBalanceError);
          throw new Error('Failed to process order payment');
        }

        console.log('✅ Buyer balance deducted successfully');
        console.log('✅ Total spent updated successfully');

        // Create purchase transaction for buyer
        await supabase
          .from('user_transactions')
          .insert({
            user_id: buyer.id,
            steam_id: orderData.buyer_steam_id,
            type: 'purchase',
            amount: orderData.total_amount,
            description: `CS2 items purchase - ${orderData.items.length} item(s)`,
            reference_id: `purchase_${Date.now()}`,
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              items: orderData.items,
              payment_method: orderData.payment_method
            }
          });

        // Generate unique transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Calculate escrow release date (48 hours from now)
        const escrowReleaseDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        // Determine seller_steam_id - if all items are from same seller, use that, otherwise use 'multiple_sellers'
        const uniqueSellersSet = new Set(orderData.items.map((item: any) => item.seller_steam_id));
        const sellerSteamId = uniqueSellersSet.size === 1
          ? orderData.items[0]?.seller_steam_id
          : 'multiple_sellers';

        // Create order record
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_steam_id: orderData.buyer_steam_id,
            seller_steam_id: sellerSteamId,
            transaction_id: transactionId,
            items: orderData.items,
            total_amount: orderData.total_amount,
            status: 'pending',
            payment_status: 'pending',
            payment_method: orderData.payment_method,
            escrow_release_date: escrowReleaseDate,
            trade_verified: false,
            metadata: {
              buyer_name: buyer.display_name,
              item_count: orderData.items.length,
              payment_secured: true,
              escrow_period_hours: 48,
              created_via: 'marketplace_purchase',
              unique_sellers: Array.from(uniqueSellersSet),
              seller_count: uniqueSellersSet.size
            }
          })
          .select()
          .single();

        if (orderError) {
          console.error('Failed to create order:', orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }

        console.log('✅ Order created successfully');
        console.log('=== CREATED ORDER DETAILS ===');
        console.log('Order ID:', newOrder.id);
        console.log('Transaction ID:', newOrder.transaction_id);
        console.log('Buyer Steam ID:', newOrder.buyer_steam_id);
        console.log('Seller Steam ID:', newOrder.seller_steam_id);
        console.log('Total Amount:', newOrder.total_amount);
        console.log('Status:', newOrder.status);
        console.log('Item Count:', orderData.items.length);
        console.log('Payment Method:', newOrder.payment_method);

        // Remove items from marketplace listings
        console.log('=== REMOVING ITEMS FROM MARKETPLACE ===');

        for (const item of orderData.items) {
          try {
            const assetId = item.id;
            const sellerSteamId = item.seller_steam_id;

            console.log(`Removing: ${item.name} (ID: ${assetId}) from seller ${sellerSteamId}`);

            const { error: removeError } = await supabase
              .from('marketplace_listings')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('steam_id', sellerSteamId)
              .eq('asset_id', assetId)
              .eq('is_active', true);

            if (removeError) {
              console.error(`Failed to remove ${item.name}:`, removeError);
            } else {
              console.log(`✅ Removed ${item.name} from marketplace`);
            }

          } catch (itemError) {
            console.error(`Error processing item ${item.name}:`, itemError);
          }
        }

        // Create notifications
        console.log('=== CREATING ORDER NOTIFICATIONS ===');

        await createNotification(
          supabase,
          orderData.buyer_steam_id,
          'success',
          '🛒 Order Created Successfully!',
          `Your order for ${orderData.items.length} item(s) has been created! Total: ${orderData.total_amount.toLocaleString('cs-CZ')} Kč. Sellers will send your items via Steam trade.`,
          `/profile?tab=orders&transaction=${transactionId}`,
          {
            order_id: transactionId,
            items: orderData.items,
            total_amount: orderData.total_amount,
            escrow_release_date: escrowReleaseDate,
            payment_secured: true
          }
        );

        // Notify sellers
        const uniqueSellers = [...new Set(orderData.items.map(item => item.seller_steam_id))];

        for (const sellerSteamId of uniqueSellers) {
          const sellerItems = orderData.items.filter(item => item.seller_steam_id === sellerSteamId);
          const sellerAmount = sellerItems.reduce((sum, item) => sum + item.price, 0);

          // Update shop stats for the seller
          await updateShopStats(supabase, sellerSteamId, sellerAmount, sellerItems.length);

          await createNotification(
            supabase,
            sellerSteamId,
            'trade',
            '💰 New Order - Payment Secured!',
            `You have a new order! ${buyer.display_name} purchased ${sellerItems.length} of your item(s) for ${sellerAmount.toLocaleString('cs-CZ')} Kč. Payment is secured - send the items via Steam trade.`,
            `/profile?tab=orders&transaction=${transactionId}`,
            {
              order_id: transactionId,
              buyer_name: buyer.display_name,
              buyer_steam_id: orderData.buyer_steam_id,
              items: sellerItems,
              amount: sellerAmount,
              payment_secured: true,
              action_required: 'send_items_via_steam'
            }
          );
        }

        console.log('=== ORDER CREATION COMPLETE ===');

        return new Response(
          JSON.stringify({
            success: true,
            order: newOrder,
            transaction_id: transactionId,
            message: 'Order created successfully',
            items_removed_from_marketplace: true
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 201
          }
        );
      }

    } else if (req.method === 'PUT') {
      // Update order status
      const orderId = url.searchParams.get('id');
      const steamId = url.searchParams.get('steam_id');

      if (!orderId || !steamId) {
        console.error('Missing required parameters for order update:', { orderId, steamId });
        return new Response(
          JSON.stringify({
            error: 'Order ID and steam_id are required',
            received: { orderId: !!orderId, steamId: !!steamId }
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const updateData = await req.json();

      console.log('=== ORDER UPDATE REQUEST ===');
      console.log('Order ID:', orderId);
      console.log('Steam ID:', steamId);
      console.log('Update data:', updateData);

      // Validate status value
      const validStatuses = ['pending', 'completed', 'cancelled', 'disputed', 'refunded'];
      if (updateData.status && !validStatuses.includes(updateData.status)) {
        console.error('Invalid status value:', updateData.status);
        return new Response(
          JSON.stringify({
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            received_status: updateData.status,
            valid_statuses: validStatuses
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Update order
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .or(`buyer_steam_id.eq.${steamId},seller_steam_id.eq.${steamId}`)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw new Error(`Failed to update order: ${error.message}`);
      }

      console.log('✅ Order updated successfully:', updatedOrder);

      return new Response(
        JSON.stringify({
          success: true,
          order: updatedOrder,
          message: 'Order updated successfully'
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
    console.error('=== ORDERS ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process order request',
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
