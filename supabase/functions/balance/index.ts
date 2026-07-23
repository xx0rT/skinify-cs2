import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface BalanceTransaction {
  steam_id: string;
  type: 'deposit' | 'purchase' | 'sale' | 'refund' | 'withdrawal' | 'admin_adjustment';
  amount: number;
  description: string;
  reference_id?: string;
  metadata?: any;
}

/**
 * Get user from users table, auto-provisioning a fresh row if missing.
 *
 * The function used to throw on missing rows, which surfaced as constant
 * 500s for accounts that signed in with Steam OpenID but whose
 * `public.users` row was never created (or was wiped). We coerce the
 * steamId to a trimmed string (defends against TEXT/BIGINT mismatch in
 * the WHERE clause) and self-heal so balance reads never dead-end.
 */
async function getUserBysteamId(supabase: any, steamId: string) {
  const sid = String(steamId).trim();
  if (!sid) {
    throw new Error('Missing steam_id in request.');
  }

  const lookup = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', sid)
    .maybeSingle();

  if (lookup.error && lookup.error.code !== 'PGRST116') {
    console.error('users lookup error:', lookup.error);
    throw new Error(`User lookup failed: ${lookup.error.message}`);
  }
  if (lookup.data) return lookup.data;

  /* Auto-provision a minimal row so the GET balance flow returns zeros
     instead of 500ing for first-time visitors / cleared dev DBs. */
  console.warn('Auto-provisioning users row for steam_id:', sid);
  const provisional = {
    steam_id: sid,
    display_name: `Trader_${sid.slice(-6)}`,
    avatar_url: null,
    current_balance: 0,
    pending_balance: 0,
    total_deposited: 0,
    total_spent: 0,
    total_earned: 0,
    currency: 'CZK',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };
  const insert = await supabase
    .from('users')
    .insert(provisional)
    .select()
    .single();
  if (!insert.error && insert.data) return insert.data;

  /* Race-recover: another concurrent request may have created the row. */
  console.warn('Auto-provision insert failed, retrying lookup:', insert.error);
  const refetch = await supabase
    .from('users')
    .select('*')
    .eq('steam_id', sid)
    .maybeSingle();
  if (refetch.data) return refetch.data;

  /* Last-ditch: return an in-memory zeroed object so the GET path still
     responds 200 with empty totals instead of dragging the UI into a
     loading loop. Note the absence of an `id` — callers using it for
     foreign keys are skipped where appropriate. */
  return provisional;
}

/**
 * Create a balance transaction
 */
async function createBalanceTransaction(
  supabase: any, 
  userId: string, 
  transaction: BalanceTransaction
) {
  // Generate unique transaction reference if not provided
  const transactionRef = transaction.reference_id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const { data, error } = await supabase
    .from('user_transactions')
    .insert({
      user_id: userId,
      steam_id: transaction.steam_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      reference_id: transactionRef,
      metadata: transaction.metadata,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  console.log('=== TRANSACTION CREATED ===');
  console.log('Transaction ID:', data.id);
  console.log('Reference ID:', transactionRef);
  console.log('Type:', transaction.type);
  console.log('Amount:', transaction.amount);
  console.log('Description:', transaction.description);
  
  // Log item details for purchase transactions
  if (transaction.type === 'purchase' && transaction.metadata?.items) {
    console.log('=== PURCHASED ITEMS ===');
    transaction.metadata.items.forEach((item: any, index: number) => {
      console.log(`Item ${index + 1}:`, {
        name: item.name,
        price: item.price,
        seller: item.seller_name,
        type: item.type,
        condition: item.condition
      });
    });
  }
  return data;
}

/**
 * For a Connect-onboarded seller, their real balance lives on Stripe
 * (sale proceeds move there via Transfer, never into current_balance —
 * see auto-escrow-release), so current_balance is a stale/legacy number
 * for them. Returns the live Stripe available balance in CZK, or null
 * if the user isn't Connect-onboarded / payouts aren't enabled / the
 * Stripe call fails — callers fall back to current_balance in that case.
 */
async function getConnectBalanceCzk(supabase: any, userId: string): Promise<number | null> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return null;

  const { data: acct } = await supabase
    .from('stripe_connect_accounts')
    .select('stripe_account_id, payouts_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (!acct?.stripe_account_id || !acct.payouts_enabled) return null;

  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        Authorization: `Basic ${btoa(stripeKey + ':')}`,
        'Stripe-Account': acct.stripe_account_id,
      },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const sumCzk = (rows: any[]) =>
      (rows || []).filter((b: any) => b.currency === 'czk').reduce((s: number, b: any) => s + b.amount, 0) / 100;
    return sumCzk(body?.available);
  } catch {
    return null;
  }
}

/**
 * Main balance handler
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
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Get user balance and recent transactions
      const steamId = url.searchParams.get('steam_id');
      
      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log(`=== FETCHING BALANCE FOR ${steamId} ===`);

      const user = await getUserBysteamId(supabase, steamId);

      console.log('=== USER BALANCE DATA ===');
      console.log('Current Balance:', user.current_balance);
      console.log('Total Deposited:', user.total_deposited);
      console.log('Total Spent:', user.total_spent);
      console.log('Total Earned:', user.total_earned);
      console.log('Pending Balance:', user.pending_balance);

      /* Recent transactions — if the table is empty/missing for a
         brand-new user we just return []. Never let this part throw. */
      let transactions: any[] = [];
      try {
        const txResp = await supabase
          .from('user_transactions')
          .select('*')
          .eq('steam_id', steamId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!txResp.error && Array.isArray(txResp.data)) {
          transactions = txResp.data;
        } else if (txResp.error) {
          console.warn('user_transactions query failed (returning []):', txResp.error.message);
        }
      } catch (txError) {
        console.warn('user_transactions threw (returning []):', txError);
      }

      /* Connect-onboarded sellers: new sale proceeds move to their real
         Stripe balance instead of current_balance (see
         auto-escrow-release), so `balance` (the main, "spendable today"
         number shown everywhere) becomes their live Stripe balance once
         they're onboarded — current_balance stops being the source of
         truth for them. Any pre-Connect DB balance isn't erased or
         combined in though: it's surfaced separately as
         `legacy_balance`, still claimable through the original
         withdraw-submit/admin-review flow until it's drawn down to
         zero. */
      const connectBalance = await getConnectBalanceCzk(supabase, user.id);
      const isConnectOnboarded = connectBalance !== null;

      return new Response(
        JSON.stringify({
          balance: isConnectOnboarded ? connectBalance : Number(user.current_balance || 0),
          legacy_balance: isConnectOnboarded ? Number(user.current_balance || 0) : 0,
          pending_balance: Number(user.pending_balance || 0),
          total_deposited: Number(user.total_deposited || 0),
          total_spent: Number(user.total_spent || 0),
          total_earned: Number(user.total_earned || 0),
          currency: user.currency || 'CZK',
          transactions: transactions || [],
          last_updated: user.updated_at,
          stripe_connect_balance: isConnectOnboarded,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );
      
    } else if (req.method === 'PUT' && url.pathname.endsWith('/transfer-pending')) {
      // Transfer pending balance to main balance (for 8-day completion)
      const { user_id, amount } = await req.json();
      
      if (!user_id || !amount) {
        return new Response(
          JSON.stringify({ error: 'user_id and amount are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      console.log(`=== TRANSFERRING PENDING TO MAIN BALANCE ===`);
      console.log('User ID:', user_id);
      console.log('Amount:', amount);
      
      // Get user current balances
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('current_balance, pending_balance, total_earned')
        .eq('id', user_id)
        .single();
        
      if (userError || !user) {
        throw new Error('User not found');
      }
      
      const currentBalance = Number(user.current_balance || 0);
      const pendingBalance = Number(user.pending_balance || 0);
      const totalEarned = Number(user.total_earned || 0);
      const transferAmount = Number(amount);
      
      if (pendingBalance < transferAmount) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient pending balance',
            pending_balance: pendingBalance,
            requested_amount: transferAmount
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      // Transfer from pending to main balance
      const newBalance = currentBalance + transferAmount;
      const newPendingBalance = pendingBalance - transferAmount;
      const newTotalEarned = totalEarned + transferAmount;
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          current_balance: newBalance,
          pending_balance: newPendingBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
        .select()
        .single();
        
      if (updateError) {
        throw new Error('Failed to transfer pending balance');
      }
      
      console.log('✅ Pending balance transferred successfully');
      
      return new Response(
        JSON.stringify({
          success: true,
          transferred_amount: transferAmount,
          new_balance: newBalance,
          new_pending_balance: newPendingBalance,
          message: 'Pending balance transferred to main balance'
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'POST') {
      // Create a new balance transaction
      const transactionData: BalanceTransaction = await req.json();
      
      console.log(`=== CREATING TRANSACTION ===`);
      console.log('Transaction data:', {
        steam_id: transactionData.steam_id,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description
      });

      if (!transactionData.steam_id || !transactionData.type || !transactionData.amount) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: steam_id, type, amount'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // SECURITY: Block direct deposit transactions - only allow through webhook
      if (transactionData.type === 'deposit') {
        return new Response(
          JSON.stringify({ 
            error: 'Direct deposit transactions not allowed. Use payment processor.',
            security_note: 'Deposits must be processed through secure payment webhook'
          }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      // Validate transaction type
      const validTypes = ['purchase', 'sale', 'refund', 'withdrawal', 'admin_adjustment'];
      if (!validTypes.includes(transactionData.type)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const user = await getUserBysteamId(supabase, transactionData.steam_id);

      /* Debiting transactions (purchase / withdrawal) MUST verify funds
         and actually move money off current_balance. Without this a
         `purchase` was just an insert — you could "spend" with a 0 Kč
         balance (the item-promotion fee bug). */
      const isDebit =
        transactionData.type === 'purchase' || transactionData.type === 'withdrawal';
      let newBalanceAfterDebit: number | null = null;
      if (isDebit) {
        const amount = Number(transactionData.amount || 0);
        if (!(amount > 0)) {
          return new Response(
            JSON.stringify({ error: 'Amount must be greater than zero.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        const currentBalance = Number(user.current_balance || 0);
        if (currentBalance < amount) {
          return new Response(
            JSON.stringify({
              error: 'Insufficient balance',
              current_balance: currentBalance,
              required: amount,
            }),
            { status: 402, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        newBalanceAfterDebit = currentBalance - amount;
      }

      const transaction = await createBalanceTransaction(supabase, user.id, transactionData);

      /* Persist the debited balance after the transaction row exists so
         a failed insert never leaves a phantom deduction. */
      if (isDebit && newBalanceAfterDebit !== null) {
        const { error: balErr } = await supabase
          .from('users')
          .update({ current_balance: newBalanceAfterDebit, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (balErr) {
          console.error('Balance debit update failed:', balErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          reference_id: transaction.reference_id,
          new_balance: newBalanceAfterDebit ?? transaction.balance_after,
          message: 'Transaction completed successfully'
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'PUT') {
      // Update transaction status (for cancellations, etc.)
      const updateData = await req.json();
      const { reference_id, status, cancel_reason } = updateData;
      
      if (!reference_id || !status) {
        return new Response(
          JSON.stringify({ error: 'reference_id and status are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      console.log(`=== UPDATING TRANSACTION STATUS ===`);
      console.log('Reference ID:', reference_id);
      console.log('New status:', status);
      
      // Update transaction status
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('user_transactions')
        .update({
          status: status,
          metadata: {
            cancel_reason: cancel_reason,
            cancelled_at: new Date().toISOString()
          }
        })
        .eq('reference_id', reference_id)
        .eq('status', 'pending')
        .select()
        .single();
      
      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Transaction not found or already processed' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      console.log('Transaction status updated:', updatedTransaction.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          transaction: updatedTransaction,
          message: 'Transaction status updated'
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

  } catch (error) {
    console.error('=== BALANCE ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process balance request',
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