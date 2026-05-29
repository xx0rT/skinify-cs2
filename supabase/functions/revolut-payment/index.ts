import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Inline validation function to avoid import issues
function validateDepositRequest(data: any): { valid: boolean; errors: string[]; sanitized?: any } {
  const errors: string[] = [];

  // Validate Steam ID
  if (!data.steam_id || typeof data.steam_id !== 'string' || data.steam_id.length < 10) {
    errors.push('Invalid Steam ID format');
  }

  // Validate amount
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('Invalid amount');
  }

  // Validate amount range (CZK)
  if (!isNaN(amount)) {
    if (amount < 50) {
      errors.push('Minimum deposit amount is 50 CZK');
    }
    if (amount > 1000000) {
      errors.push('Maximum deposit amount is 1,000,000 CZK');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      steam_id: data.steam_id,
      amount: amount
    }
  };
}

/**
 * Create Revolut payment order and return paylink
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    console.log('=== REVOLUT PAYMENT API START ===');

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

    // Parse and validate request body
    const requestData = await req.json();

    // Handle both old and new request formats
    const currency = requestData.currency || 'CZK';
    const amountCzk = requestData.amount_czk || requestData.amount;
    const totalBalanceToAdd = requestData.total_balance_to_add || amountCzk;

    // Use provided EUR amount or calculate it
    const conversionRate = requestData.conversion_rate || 24.37;
    const amountEur = requestData.amount_eur || (amountCzk / conversionRate);

    console.log('Payment request:', {
      steam_id: requestData.steam_id,
      amount: requestData.amount,
      amount_eur: amountEur,
      amount_czk: amountCzk,
      total_balance_to_add: totalBalanceToAdd,
      currency: currency,
      conversion_rate: conversionRate
    });

    // Input validation - always validate the CZK amount for range checking
    const validation = validateDepositRequest({
      steam_id: requestData.steam_id,
      amount: amountCzk
    });

    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    const { steam_id } = validation.sanitized!;
    const depositAmountEur = amountEur;
    const depositAmountCzk = amountCzk;

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, steam_id, display_name')
      .eq('steam_id', steam_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({
          error: 'User not found. Please log in with Steam first.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('User verified:', user.display_name);

    // Generate unique order reference
    const orderRef = `skinify_${steam_id}_${Date.now()}`;

    console.log('=== CREATING REVOLUT ORDER ===');
    console.log('Payment amounts:', {
      amountInEur: depositAmountEur,
      amountInCzk: depositAmountCzk,
      balanceToAdd: totalBalanceToAdd
    });

    // Create order with Revolut API using EUR amount from frontend
    const revolutPayload = {
      amount: Math.round(depositAmountEur * 100), // Convert to cents
      currency: 'EUR',
      description: `Skinify CS2 Marketplace Deposit - ${depositAmountCzk.toFixed(0)} CZK (${depositAmountEur.toFixed(2)} EUR)`,
      merchant_order_ext_ref: orderRef
    };

    console.log('Revolut API payload:', revolutPayload);

    // Call Revolut API
    const revolutResponse = await fetch('https://sandbox-merchant.revolut.com/api/1.0/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revolutSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(revolutPayload)
    });

    console.log('Revolut API response status:', revolutResponse.status);

    const responseText = await revolutResponse.text();
    console.log('Revolut API response:', responseText.substring(0, 200));

    let revolutOrder;
    try {
      revolutOrder = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Revolut response:', parseError);
      throw new Error(`Revolut API returned invalid JSON. Status: ${revolutResponse.status}`);
    }

    if (!revolutResponse.ok) {
      console.error('Revolut API error:', revolutOrder);
      return new Response(
        JSON.stringify({
          error: `Revolut API error: ${revolutResponse.status}`,
          details: revolutOrder.message || revolutOrder.error || 'Unknown Revolut error',
          code: revolutOrder.code
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('Revolut order created:', {
      id: revolutOrder.id,
      state: revolutOrder.state,
      checkout_url: revolutOrder.checkout_url
    });

    const checkoutUrl = revolutOrder.checkout_url;

    if (!checkoutUrl) {
      throw new Error('No checkout URL received from Revolut');
    }

    // Store pending transaction in database
    console.log('=== STORING TRANSACTION IN DATABASE ===');

    const bonuses = requestData.bonuses || {};

    const { data: transaction, error: transactionError } = await supabase
      .from('user_transactions')
      .insert({
        user_id: user.id,
        steam_id: steam_id,
        type: 'deposit',
        amount: totalBalanceToAdd,
        description: `Revolut deposit - ${depositAmountCzk.toFixed(0)} CZK (${depositAmountEur.toFixed(2)} EUR) → You receive: ${totalBalanceToAdd.toFixed(0)} CZK`,
        reference_id: orderRef,
        status: 'pending',
        metadata: {
          revolut_order_id: revolutOrder.id,
          revolut_token: revolutOrder.token,
          payment_method: 'revolut',
          payment_amount_czk: depositAmountCzk,
          payment_amount_eur: depositAmountEur,
          balance_to_add: totalBalanceToAdd,
          currency: 'EUR',
          original_currency: 'CZK',
          conversion_rate: conversionRate,
          bonuses: bonuses,
          created_via: 'revolut_api',
          webhook_required: true,
          revolut_state: revolutOrder.state,
          checkout_url: checkoutUrl
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Database error:', transactionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to store transaction record',
          details: transactionError.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log('Transaction stored:', transaction.id);
    console.log('=== REVOLUT PAYMENT CREATION COMPLETE ===');

    // Return the checkout URL
    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        revolut_order_id: revolutOrder.id,
        revolut_token: revolutOrder.token,
        transaction_id: transaction.id,
        order_ref: orderRef,
        amount: depositAmountEur,
        currency: 'EUR',
        display_currency: 'CZK',
        state: revolutOrder.state
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );

  } catch (error) {
    console.error('=== REVOLUT PAYMENT ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: 'Payment creation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});
