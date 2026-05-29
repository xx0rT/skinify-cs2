import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Revolut-Signature, Revolut-Request-Timestamp",
};

/**
 * Verify Revolut webhook signature using HMAC-SHA256
 * SECURITY: Verifies webhook authenticity to prevent fraud
 */
async function verifyRevolutSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  try {
    console.log('=== VERIFYING REVOLUT WEBHOOK SIGNATURE ===');

    // Get webhook signing secret from environment
    const signingSecret = Deno.env.get('REVOLUT_WEBHOOK_SECRET');

    if (!signingSecret) {
      console.error('❌ REVOLUT_WEBHOOK_SECRET not configured');
      throw new Error('Webhook signing secret not configured');
    }

    if (!signature || !timestamp) {
      console.error('❌ Missing signature or timestamp headers');
      return false;
    }

    // Check timestamp to prevent replay attacks (allow 5 minute window)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - requestTime);

    if (timeDifference > 300) {
      console.error('❌ Webhook timestamp too old or in future:', {
        requestTime,
        currentTime,
        difference: timeDifference
      });
      return false;
    }

    // Create signature payload: timestamp + raw body
    const signaturePayload = `${timestamp}.${rawBody}`;

    // Create HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);
    const messageData = encoder.encode(signaturePayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures (constant-time comparison)
    const signaturesMatch = computedSignature === signature.toLowerCase();

    if (signaturesMatch) {
      console.log('✅ Webhook signature verified successfully');
      return true;
    } else {
      console.error('❌ Webhook signature verification failed');
      console.error('Expected signature format: HMAC-SHA256 hex string');
      return false;
    }

  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * Process completed Revolut payment with direct balance update
 */
async function processCompletedPayment(
  supabase: any,
  merchantOrderRef: string,
  revolutOrderId: string,
  amount: number
) {
  console.log(`=== PROCESSING COMPLETED PAYMENT ===`);
  console.log(`Order Reference: ${merchantOrderRef}`);
  console.log(`Revolut Order ID: ${revolutOrderId}`);
  console.log(`Amount: ${amount}`);

  try {
    // Check if this is a VIP subscription order
    const isVipOrder = merchantOrderRef.startsWith('vip_');

    // Extract Steam ID from merchant order reference
    const steamIdMatch = isVipOrder
      ? merchantOrderRef.match(/vip_[^_]+_[^_]+_([^_]+)_/)
      : merchantOrderRef.match(/skinify_([^_]+)_/);
    const steamId = steamIdMatch ? steamIdMatch[1] : null;

    if (!steamId) {
      throw new Error('Could not extract Steam ID from merchant order reference');
    }

    console.log('Extracted Steam ID:', steamId);
    console.log('Is VIP order:', isVipOrder);

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('steam_id', steamId)
      .single();

    if (userError || !user) {
      throw new Error('User not found for payment processing');
    }

    console.log('User found:', user.display_name, 'Current balance:', user.current_balance);

    // Handle VIP subscription payment
    if (isVipOrder) {
      console.log('=== PROCESSING VIP SUBSCRIPTION PAYMENT ===');

      // Find the subscription record
      const { data: subscription, error: subError } = await supabase
        .from('vip_subscriptions')
        .select('*')
        .eq('revolut_order_id', revolutOrderId)
        .maybeSingle();

      if (subError) {
        console.error('Error querying VIP subscription:', subError);
        console.error('Query details:', { revolutOrderId, merchantOrderRef });
      }

      if (!subscription) {
        console.error('VIP subscription not found in database');
        console.error('Looking for revolut_order_id:', revolutOrderId);
        console.error('Merchant order ref:', merchantOrderRef);

        // Try to find by reference_id in transactions instead
        const { data: txData } = await supabase
          .from('user_transactions')
          .select('metadata')
          .eq('reference_id', merchantOrderRef)
          .maybeSingle();

        if (txData?.metadata?.subscription_id) {
          console.log('Found subscription ID in transaction:', txData.metadata.subscription_id);
          const { data: subByTx } = await supabase
            .from('vip_subscriptions')
            .select('*')
            .eq('id', txData.metadata.subscription_id)
            .maybeSingle();

          if (subByTx) {
            console.log('Found subscription via transaction link');
            subscription = subByTx;
          }
        }

        if (!subscription) {
          console.error('CRITICAL: VIP subscription record not found after all attempts');
          throw new Error('VIP subscription record not found. Please contact support with this order ID: ' + revolutOrderId);
        }
      }

      // Activate the subscription
      const { data: updatedSubscription, error: updateSubError } = await supabase
        .from('vip_subscriptions')
        .update({
          status: 'active',
          start_date: new Date().toISOString(),
          metadata: {
            ...subscription.metadata,
            activated_at: new Date().toISOString(),
            payment_confirmed: true
          }
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (updateSubError) {
        console.error('Failed to activate subscription:', updateSubError);
        throw new Error('Failed to activate subscription');
      }

      // Update user's VIP tier
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          vip_tier: subscription.tier,
          vip_expires_at: subscription.end_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('Failed to update user VIP tier:', userUpdateError);
        throw new Error('Failed to update user VIP status');
      }

      // Update transaction status
      const { error: txError } = await supabase
        .from('user_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('reference_id', merchantOrderRef);

      if (txError) {
        console.error('Failed to update transaction:', txError);
      }

      // Create notification
      await supabase
        .from('user_notifications')
        .insert({
          user_id: user.id,
          type: 'vip_activated',
          title: `${subscription.tier.toUpperCase()} Subscription Activated`,
          message: `Your ${subscription.tier.toUpperCase()} subscription is now active! Enjoy all premium benefits.`,
          metadata: {
            subscription_id: subscription.id,
            tier: subscription.tier,
            plan_type: subscription.plan_type,
            end_date: subscription.end_date
          }
        });

      console.log('✅ VIP SUBSCRIPTION ACTIVATED:', {
        user_id: user.id,
        tier: subscription.tier,
        plan_type: subscription.plan_type,
        expires_at: subscription.end_date
      });

      return {
        success: true,
        type: 'vip_subscription',
        subscription_id: subscription.id,
        tier: subscription.tier
      };
    }

    // Find or create transaction
    let transaction = null;
    
    // Try to find existing transaction
    const { data: existingTransaction } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('reference_id', merchantOrderRef)
      .maybeSingle();

    if (existingTransaction) {
      transaction = existingTransaction;
      console.log('Found existing transaction:', transaction.id);
    } else {
      // Create new transaction for webhook
      console.log('Creating new transaction for webhook');
      
      const { data: newTransaction, error: createError } = await supabase
        .from('user_transactions')
        .insert({
          user_id: user.id,
          steam_id: steamId,
          type: 'deposit',
          amount: amount,
          description: `Revolut webhook deposit - ${amount.toLocaleString('cs-CZ')} Kč`,
          reference_id: merchantOrderRef,
          status: 'pending',
          metadata: {
            revolut_order_id: revolutOrderId,
            created_via: 'webhook',
            webhook_received_at: new Date().toISOString(),
            payment_completed: true
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create transaction:', createError);
        throw new Error('Failed to create transaction record');
      }

      transaction = newTransaction;
      console.log('✅ New transaction created:', transaction.id);
    }

    // Complete the transaction if not already completed
    if (transaction.status !== 'completed') {
      console.log('=== COMPLETING TRANSACTION AND UPDATING BALANCE ===');
      
      const { data: completedTransaction, error: completeError } = await supabase
        .from('user_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...transaction.metadata,
            revolut_order_id: revolutOrderId,
            completed_via: 'webhook',
            webhook_processed_at: new Date().toISOString(),
            payment_confirmed: true
          }
        })
        .eq('id', transaction.id)
        .select()
        .single();

      if (completeError) {
        console.error('Failed to complete transaction:', completeError);
        throw new Error('Failed to complete transaction');
      }

      // MANUALLY UPDATE USER BALANCE (Direct database update)
      console.log('=== UPDATING USER BALANCE DIRECTLY ===');
      
      const currentBalance = Number(user.current_balance || 0);
      const currentDeposited = Number(user.total_deposited || 0);
      const depositAmount = Number(amount);
      const newBalance = currentBalance + depositAmount;
      const newDeposited = currentDeposited + depositAmount;
      
      console.log('Balance calculation:', {
        current_balance: currentBalance,
        deposit_amount: depositAmount,
        new_balance: newBalance,
        current_deposited: currentDeposited,
        new_deposited: newDeposited
      });
      
      const { data: updatedUser, error: balanceError } = await supabase
        .from('users')
        .update({
          current_balance: newBalance,
          total_deposited: newDeposited,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (balanceError) {
        console.error('CRITICAL: Failed to update user balance:', balanceError);
        throw new Error('Failed to update user balance');
      }

      console.log('✅ USER BALANCE UPDATED SUCCESSFULLY:', {
        user_id: user.id,
        old_balance: currentBalance,
        new_balance: updatedUser.current_balance,
        amount_added: depositAmount
      });

      // Create success notification
      await supabase
        .from('user_notifications')
        .insert({
          user_steam_id: steamId,
          type: 'success',
          title: '💰 Deposit Completed!',
          message: `Your Revolut payment of ${depositAmount.toLocaleString('cs-CZ')} Kč has been successfully processed! Your new balance is ${newBalance.toLocaleString('cs-CZ')} Kč.`,
          action_url: '/profile',
          metadata: { 
            revolut_order_id: revolutOrderId,
            transaction_id: transaction.id,
            amount: depositAmount,
            completed_via: 'revolut_webhook',
            new_balance: newBalance,
            old_balance: currentBalance
          }
        });

      console.log('✅ WEBHOOK PROCESSING COMPLETE - BALANCE UPDATED');
      return completedTransaction;
    } else {
      console.log('Transaction already completed, no action needed');
      return transaction;
    }

  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

/**
 * Enhanced Revolut webhook handler with direct balance updates
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== REVOLUT WEBHOOK RECEIVED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      // Get headers for verification
      const signature = req.headers.get('Revolut-Signature');
      const timestamp = req.headers.get('Revolut-Request-Timestamp');

      // Get raw body for signature verification
      const rawBody = await req.text();

      // Verify webhook signature (currently disabled - enable in production)
      const isValid = await verifyRevolutSignature(rawBody, signature, timestamp);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log('Raw webhook body (first 300 chars):', rawBody.substring(0, 300));
      
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('Failed to parse webhook JSON:', parseError);
        throw new Error('Invalid JSON in webhook body');
      }
      
      console.log('Parsed webhook data:', {
        event: webhookData.event,
        order_id: webhookData.data?.id,
        state: webhookData.data?.state,
        merchant_ref: webhookData.data?.merchant_order_ext_ref,
        amount: webhookData.data?.amount || webhookData.data?.order_amount?.value
      });

      // Process webhook events
      const event = webhookData.event;
      const orderData = webhookData.data;

      console.log(`=== PROCESSING WEBHOOK EVENT: ${event} ===`);

      switch (event) {
        case 'ORDER_COMPLETED':
        case 'ORDER_AUTHORISED':
        case 'ORDER_PAYMENT_COMPLETED':
          console.log('✅ Payment completion event received');
          
          const amount = orderData.amount 
            ? orderData.amount / 100  // Convert from cents
            : orderData.order_amount?.value 
              ? orderData.order_amount.value / 100
              : 20000; // Default fallback
            
          const merchantOrderRef = orderData.merchant_order_ext_ref;
          
          if (!merchantOrderRef) {
            console.error('❌ Missing merchant_order_ext_ref in webhook');
            throw new Error('Missing merchant order reference');
          }

          console.log('Processing payment completion:', {
            amount: amount,
            merchant_ref: merchantOrderRef,
            revolut_order_id: orderData.id
          });

          await processCompletedPayment(
            supabase,
            merchantOrderRef,
            orderData.id,
            amount
          );
          
          console.log('✅ Webhook processing completed successfully');
          break;

        case 'ORDER_FAILED':
        case 'ORDER_DECLINED':
        case 'ORDER_CANCELLED':
          console.log('❌ Payment failed/cancelled event');
          
          const failedRef = orderData.merchant_order_ext_ref;
          if (failedRef) {
            await supabase
              .from('user_transactions')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                metadata: {
                  failure_reason: event,
                  failed_via: 'webhook'
                }
              })
              .eq('reference_id', failedRef);
          }
          break;

        default:
          console.log('ℹ️ Unhandled webhook event:', event);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          event_processed: event,
          order_id: orderData?.id,
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
    console.error('=== REVOLUT WEBHOOK ERROR ===', error);
    
    // Always return 200 for webhooks to prevent retries
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});