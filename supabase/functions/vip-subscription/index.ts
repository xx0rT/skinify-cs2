import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

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
    const revolutSecretKey = Deno.env.get('REVOLUT_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!revolutSecretKey) {
      throw new Error('REVOLUT_SECRET_KEY environment variable is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData = await req.json();
    const { steam_id, tier, plan_type, auto_renew = true } = requestData;

    if (!steam_id || !tier || !plan_type) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: steam_id, tier, plan_type'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, steam_id, display_name')
      .eq('steam_id', steam_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'User not found. Please log in with Steam first.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Define subscription prices in CZK
    const prices: Record<string, Record<string, number>> = {
      vip: {
        monthly: 299,
        yearly: 2990
      },
      elite: {
        monthly: 599,
        yearly: 5990
      }
    };

    // Free tier doesn't need payment
    if (tier === 'free') {
      return new Response(
        JSON.stringify({
          error: 'Free tier does not require payment'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    const amountCzk = prices[tier]?.[plan_type];
    if (!amountCzk) {
      return new Response(
        JSON.stringify({
          error: 'Invalid tier or plan_type'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Convert CZK to EUR for Revolut
    const conversionRate = 24.37;
    const amountEur = amountCzk / conversionRate;

    // Generate unique order reference
    const orderRef = `vip_${tier}_${plan_type}_${steam_id}_${Date.now()}`;

    // Create order with Revolut API
    const revolutPayload = {
      amount: Math.round(amountEur * 100),
      currency: 'EUR',
      description: `Skinify ${tier.toUpperCase()} Subscription - ${plan_type} (${amountCzk} CZK)`,
      merchant_order_ext_ref: orderRef
    };

    console.log('Creating Revolut order:', revolutPayload);

    const revolutResponse = await fetch('https://sandbox-merchant.revolut.com/api/1.0/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revolutSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(revolutPayload)
    });

    const responseText = await revolutResponse.text();
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
          details: revolutOrder.message || revolutOrder.error || 'Unknown Revolut error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    const checkoutUrl = revolutOrder.checkout_url;
    if (!checkoutUrl) {
      throw new Error('No checkout URL received from Revolut');
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan_type === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan_type === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('vip_subscriptions')
      .insert({
        user_id: user.id,
        tier: tier,
        plan_type: plan_type,
        status: 'pending',
        amount: amountCzk,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        next_billing_date: endDate.toISOString(),
        revolut_order_id: revolutOrder.id,
        auto_renew: auto_renew,
        metadata: {
          revolut_token: revolutOrder.token,
          payment_amount_czk: amountCzk,
          payment_amount_eur: amountEur,
          conversion_rate: conversionRate,
          order_ref: orderRef,
          checkout_url: checkoutUrl,
          revolut_state: revolutOrder.state
        }
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Database error:', subscriptionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create subscription record',
          details: subscriptionError.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Create transaction record
    await supabase
      .from('user_transactions')
      .insert({
        user_id: user.id,
        steam_id: steam_id,
        type: 'vip_subscription',
        amount: amountCzk,
        description: `VIP ${tier.toUpperCase()} Subscription - ${plan_type}`,
        reference_id: orderRef,
        status: 'pending',
        metadata: {
          subscription_id: subscription.id,
          revolut_order_id: revolutOrder.id,
          tier: tier,
          plan_type: plan_type,
          payment_method: 'revolut'
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        subscription_id: subscription.id,
        revolut_order_id: revolutOrder.id,
        amount: amountEur,
        amount_czk: amountCzk,
        currency: 'EUR',
        tier: tier,
        plan_type: plan_type,
        end_date: endDate.toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );

  } catch (error) {
    console.error('VIP subscription error:', error);
    return new Response(
      JSON.stringify({
        error: 'Subscription creation failed',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});
