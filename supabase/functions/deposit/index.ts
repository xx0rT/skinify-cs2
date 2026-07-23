import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface DepositRequest {
  steam_id: string;
  amount: number;
  payment_method: 'card' | 'bank' | 'gopay';
  return_url?: string;
}

interface GoPayPaymentResponse {
  id: string;
  gw_url: string;
  state: string;
}

/**
 * Create GoPay payment (mock implementation)
 * In production, use actual GoPay API
 */
async function createGoPayPayment(amount: number, orderId: string, returnUrl: string): Promise<GoPayPaymentResponse> {
  // This is a mock implementation
  // In production, integrate with actual GoPay REST API
  
  console.log('Creating GoPay payment:', { amount, orderId, returnUrl });
  
  // Mock GoPay response
  return {
    id: `gopay_${Date.now()}`,
    gw_url: `https://gate.gopay.cz/gp-gw/v3/pay?id=${orderId}`,
    state: 'CREATED'
  };
}

/**
 * Validate user and get user info
 */
async function validateUser(supabase: any, steamId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', steamId)
    .single();

  if (error || !user) {
    throw new Error('User not found. Please log in with Steam first.');
  }

  return user;
}

/**
 * Create deposit transaction record
 */
async function createDepositTransaction(
  supabase: any, 
  userId: string, 
  amount: number, 
  paymentMethod: string,
  referenceId?: string
) {
  const { data: transaction, error } = await supabase
    .from('balance_transactions')
    .insert({
      user_id: userId,
      type: 'deposit',
      amount: amount,
      description: `Deposit via ${paymentMethod}`,
      reference_id: referenceId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return transaction;
}

/**
 * Main deposit handler
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      // Create new deposit
      console.log('=== CREATING DEPOSIT ===');
      
      const depositData: DepositRequest = await req.json();
      console.log('Deposit request:', {
        steam_id: depositData.steam_id,
        amount: depositData.amount,
        payment_method: depositData.payment_method
      });

      // Validate input
      if (!depositData.steam_id || !depositData.amount || !depositData.payment_method) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: steam_id, amount, payment_method'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (depositData.amount < 50) {
        return new Response(
          JSON.stringify({ 
            error: 'Minimum deposit amount is 50 CZK'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate user
      const user = await validateUser(supabase, depositData.steam_id);
      console.log('User validated:', user.display_name);

      // Generate unique order ID
      const orderId = `deposit_${user.id}_${Date.now()}`;

      // Create transaction record
      let transaction;
      let paymentResponse = null;

      if (depositData.payment_method === 'gopay') {
        // Create GoPay payment
        const returnUrl = depositData.return_url || 'https://skinify.gg/profile?tab=balance';
        
        try {
          paymentResponse = await createGoPayPayment(
            depositData.amount,
            orderId,
            returnUrl
          );
          
          transaction = await createDepositTransaction(
            supabase,
            user.id,
            depositData.amount,
            'GoPay',
            paymentResponse.id
          );

          console.log('GoPay payment created:', paymentResponse.id);

          return new Response(
            JSON.stringify({
              success: true,
              transaction_id: transaction.id,
              payment_url: paymentResponse.gw_url,
              payment_id: paymentResponse.id,
              amount: depositData.amount,
              currency: 'CZK',
              status: 'pending'
            }),
            { 
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 201
            }
          );

        } catch (goPayError) {
          console.error('GoPay error:', goPayError);
          throw new Error(`GoPay payment creation failed: ${goPayError.message}`);
        }

      } else {
        // Handle other payment methods (card, bank transfer)
        transaction = await createDepositTransaction(
          supabase,
          user.id,
          depositData.amount,
          depositData.payment_method
        );

        // For demo purposes, auto-complete non-GoPay payments
        // In production, integrate with actual payment processors
        
        // Simulate payment processing delay
        setTimeout(async () => {
          await supabase
            .from('balance_transactions')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', transaction.id);
        }, 3000);

        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: transaction.id,
            amount: depositData.amount,
            currency: 'CZK',
            status: 'processing',
            message: 'Payment is being processed'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 201
          }
        );
      }

    } else if (req.method === 'GET') {
      // Get user balance and transactions
      const url = new URL(req.url);
      const steamId = url.searchParams.get('steam_id');

      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const user = await validateUser(supabase, steamId);

      // Get recent transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Failed to fetch transactions:', transactionsError);
      }

      return new Response(
        JSON.stringify({
          balance: user.balance || 0,
          total_deposited: user.total_deposited || 0,
          total_spent: user.total_spent || 0,
          transactions: transactions || [],
          currency: 'CZK'
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
    console.error('=== DEPOSIT ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process deposit request',
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