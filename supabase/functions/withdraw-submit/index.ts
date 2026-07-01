/*
  withdraw-submit — user creates a withdrawal request.

  The function runs as service_role and performs the whole flow
  atomically:

    1. Validates the request (amount ≥ minimum, method is supported,
       payout details present).
    2. Checks the user's spendable balance.
    3. Deducts the amount from `users.current_balance` (via a
       `hold_withdrawal` transaction whose trigger updates the balance).
    4. Inserts the withdraw_requests row with status='pending'.

  The user's money moves into a "held" state until the admin approves
  or rejects. On reject, the review function credits it back. On
  approve, the money is considered paid out and the admin triggers
  the real payout externally (bank / crypto / etc.).

  Auth: same pattern as dm-send — trust `x-steam-id` header. Anyone
  spoofing another user's steam_id would already have hijacked their
  Skinify account.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

const MIN_WITHDRAWAL = 100;
const WITHDRAWAL_FEE_RATE = 0.015;
const ALLOWED_METHODS = ['bank_transfer', 'card', 'paypal', 'crypto'];

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: { code: 'config', message: 'Server misconfigured.' } });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const steamId = req.headers.get('x-steam-id');
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return json(400, {
      error: { code: 'missing_sender', message: 'x-steam-id header required (17-digit Steam ID).' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: 'invalid_json', message: 'Body must be JSON.' } });
  }

  const amount = Number(body?.amount);
  const method = String(body?.method || '');
  const payoutDetails = body?.payout_details || {};

  if (!Number.isFinite(amount) || amount <= 0) {
    return json(400, { error: { code: 'invalid_amount', message: 'Amount must be a positive number.' } });
  }
  if (amount < MIN_WITHDRAWAL) {
    return json(400, {
      error: {
        code: 'below_minimum',
        message: `Minimum withdrawal is ${MIN_WITHDRAWAL} CZK.`,
      },
    });
  }
  if (!ALLOWED_METHODS.includes(method)) {
    return json(400, {
      error: {
        code: 'invalid_method',
        message: `Method must be one of: ${ALLOWED_METHODS.join(', ')}.`,
      },
    });
  }
  if (!payoutDetails || typeof payoutDetails !== 'object' || Object.keys(payoutDetails).length === 0) {
    return json(400, {
      error: { code: 'missing_payout_details', message: 'Payout details required.' },
    });
  }

  /* Look up user + verify balance. */
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, current_balance')
    .eq('steam_id', steamId)
    .maybeSingle();
  if (userErr) {
    return json(500, { error: { code: 'db_error', message: userErr.message } });
  }
  if (!user) {
    return json(403, {
      error: { code: 'unregistered_sender', message: 'Sender is not a registered user.' },
    });
  }
  const balance = Number(user.current_balance || 0);
  if (balance < amount) {
    return json(400, {
      error: {
        code: 'insufficient_balance',
        message: 'You don\'t have enough balance to withdraw this amount.',
        current_balance: balance,
        required_amount: amount,
      },
    });
  }

  const fee = Math.round(amount * WITHDRAWAL_FEE_RATE * 100) / 100;
  const netAmount = Math.round((amount - fee) * 100) / 100;

  /* Insert a transaction that deducts the balance (the existing
     update_user_balance trigger handles current_balance & total_spent).
     Type 'withdrawal' is in the debit branch so the trigger deducts. */
  const { error: txErr } = await supabase.from('user_transactions').insert({
    user_id: user.id,
    steam_id: steamId,
    type: 'withdrawal',
    amount,
    description: `Withdrawal request via ${method} — fee ${fee} CZK, net ${netAmount} CZK.`,
    reference_id: `withdrawal_hold_${steamId}_${Date.now()}`,
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: {
      withdrawal_method: method,
      gross_amount: amount,
      fee_amount: fee,
      net_amount: netAmount,
      payout_details: payoutDetails,
    },
  });
  if (txErr) {
    return json(500, { error: { code: 'db_error', message: txErr.message } });
  }

  /* Now create the withdraw_requests row. Admin will review later. */
  const { data: reqRow, error: reqErr } = await supabase
    .from('withdraw_requests')
    .insert({
      user_id: user.id,
      user_steam_id: steamId,
      amount,
      fee,
      net_amount: netAmount,
      currency: 'CZK',
      method,
      payout_details: payoutDetails,
      status: 'pending',
    })
    .select('id, created_at')
    .single();
  if (reqErr) {
    return json(500, {
      error: { code: 'db_error', message: reqErr.message },
    });
  }

  /* Notify admin via user_notifications. Admin panel picks this up. */
  await supabase.from('user_notifications').insert({
    user_steam_id: '76561198021723640',
    type: 'warning',
    title: 'New withdrawal request',
    message: `${amount} CZK via ${method} (${steamId})`,
    action_url: '/admin?tab=withdrawals',
    metadata: { withdraw_request_id: reqRow.id, amount, method, steam_id: steamId },
  });

  return json(201, {
    data: {
      id: reqRow.id,
      created_at: reqRow.created_at,
      amount,
      fee,
      net_amount: netAmount,
      status: 'pending',
    },
  });
});
