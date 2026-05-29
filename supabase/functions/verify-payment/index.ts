import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * SECURE payment verification - only add money if Revolut confirms payment was actually completed
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const orderRef = url.searchParams.get('order_ref');
    
    if (!orderRef) {
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'order_ref parameter is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log(`=== SECURE PAYMENT VERIFICATION ===`);
    console.log('Order Reference:', orderRef);
    console.log('This endpoint now ONLY adds money if payment was actually completed');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const revolutSecretKey = Deno.env.get('REVOLUT_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!revolutSecretKey) {
      throw new Error('REVOLUT_SECRET_KEY environment variable is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract Steam ID from order reference
    const steamIdMatch = orderRef.match(/skinify_([^_]+)_/);
    const steamId = steamIdMatch ? steamIdMatch[1] : null;
    
    if (!steamId) {
      throw new Error('Could not extract Steam ID from order reference');
    }

    console.log('Extracted Steam ID:', steamId);

    // Find the transaction in our database
    const { data: transaction, error: transactionError } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('reference_id', orderRef)
      .single();

    if (transactionError || !transaction) {
      console.log('❌ NO TRANSACTION FOUND IN DATABASE');
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Payment transaction not found',
          message: 'No payment record found. Payment may have been cancelled or failed.',
          payment_completed: false
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('Found transaction:', {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      reference_id: transaction.reference_id
    });

    // Get Revolut order ID from transaction metadata
    const revolutOrderId = transaction.metadata?.revolut_order_id;
    
    if (!revolutOrderId) {
      console.log('❌ NO REVOLUT ORDER ID IN TRANSACTION');
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Missing Revolut order ID',
          payment_completed: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('=== CHECKING ACTUAL REVOLUT PAYMENT STATUS ===');
    console.log('Revolut Order ID:', revolutOrderId);

    // Check the actual payment status with Revolut API
    const revolutStatusResponse = await fetch(`https://sandbox-merchant.revolut.com/api/1.0/orders/${revolutOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${revolutSecretKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2024-09-01'
      }
    });

    if (!revolutStatusResponse.ok) {
      console.error('❌ FAILED TO CHECK REVOLUT PAYMENT STATUS');
      console.error('Status:', revolutStatusResponse.status);
      console.error('Response:', await revolutStatusResponse.text());
      
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Unable to verify payment with Revolut',
          payment_completed: false,
          message: 'Payment verification failed. Please contact support if you completed the payment.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    const revolutOrderData = await revolutStatusResponse.json();
    console.log('Revolut order status:', {
      id: revolutOrderData.id,
      state: revolutOrderData.state,
      amount: revolutOrderData.amount,
      currency: revolutOrderData.currency
    });

    // SECURITY CHECK: Only proceed if Revolut confirms payment was actually completed
    const paymentCompleted = revolutOrderData.state === 'COMPLETED' || 
                              revolutOrderData.state === 'PROCESSED' ||
                              revolutOrderData.state === 'AUTHORISED';

    if (!paymentCompleted) {
      console.log('❌ PAYMENT NOT COMPLETED');
      console.log('Current state:', revolutOrderData.state);
      console.log('Payment was not actually completed - window was just closed');
      
      // Mark transaction as cancelled since payment wasn't completed
      await supabase
        .from('user_transactions')
        .update({
          status: 'cancelled',
          metadata: {
            ...transaction.metadata,
            revolut_state: revolutOrderData.state,
            cancelled_reason: 'Payment window closed without completion',
            cancelled_at: new Date().toISOString()
          }
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({
          verified: false,
          payment_completed: false,
          revolut_state: revolutOrderData.state,
          error: 'Payment was not completed',
          message: 'You closed the payment window without completing the payment. No funds have been added to your account.',
          expected_states: ['COMPLETED', 'PROCESSED', 'AUTHORISED'],
          actual_state: revolutOrderData.state
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('✅ PAYMENT VERIFIED AS COMPLETED');
    console.log('Revolut confirms payment state:', revolutOrderData.state);

    // Payment was actually completed - now we can safely add the money
    if (transaction.status !== 'completed') {
      console.log('=== COMPLETING VERIFIED PAYMENT ===');
      
      // Get user info for balance update
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('steam_id', steamId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Complete the transaction
      const { data: completedTransaction, error: completeError } = await supabase
        .from('user_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...transaction.metadata,
            revolut_order_id: revolutOrderId,
            revolut_state: revolutOrderData.state,
            verified_via: 'api_check',
            payment_confirmed_by_revolut: true,
            verified_at: new Date().toISOString()
          }
        })
        .eq('id', transaction.id)
        .select()
        .single();

      if (completeError) {
        throw new Error('Failed to complete transaction');
      }

      // Update user balance
      const currentBalance = Number(user.current_balance || 0);
      const currentDeposited = Number(user.total_deposited || 0);
      const depositAmount = Number(transaction.amount);
      const newBalance = currentBalance + depositAmount;
      const newDeposited = currentDeposited + depositAmount;
      
      console.log('=== UPDATING USER BALANCE ===');
      console.log('Adding verified payment to balance:', {
        current_balance: currentBalance,
        deposit_amount: depositAmount,
        new_balance: newBalance
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
        throw new Error('Failed to update balance');
      }

      // Create success notification
      await supabase
        .from('user_notifications')
        .insert({
          user_steam_id: steamId,
          type: 'success',
          title: '💰 Payment Verified!',
          message: `Your Revolut payment of ${depositAmount.toLocaleString('cs-CZ')} Kč has been verified and added to your account!`,
          action_url: '/profile',
          metadata: { 
            transaction_id: transaction.id,
            amount: depositAmount,
            verified_via: 'secure_verification',
            revolut_state: revolutOrderData.state,
            balance_updated: true
          }
        });

      console.log('✅ PAYMENT VERIFIED AND BALANCE UPDATED');

      return new Response(
        JSON.stringify({
          verified: true,
          payment_completed: true,
          transaction_id: transaction.id,
          amount: depositAmount,
          new_balance: newBalance,
          old_balance: currentBalance,
          revolut_state: revolutOrderData.state,
          message: 'Payment verified successfully! Funds added to your account.',
          balance_updated: true
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Transaction already completed
    console.log('✅ PAYMENT ALREADY COMPLETED');
    
    return new Response(
      JSON.stringify({
        verified: true,
        payment_completed: true,
        transaction_id: transaction.id,
        amount: transaction.amount,
        revolut_state: revolutOrderData.state,
        message: 'Payment already processed',
        already_completed: true
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('=== PAYMENT VERIFICATION ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        verified: false,
        payment_completed: false,
        error: 'Payment verification failed',
        details: error.message,
        message: 'Unable to verify payment status. Please contact support if you completed the payment.',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});