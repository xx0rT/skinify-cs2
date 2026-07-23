/*
  stripe-payment — custom-coded Stripe checkout backend for wallet deposits.

  Actions (POST JSON { action, ... }):

  - create_intent { amount, userId, steamId }
      Creates a Stripe PaymentIntent (CZK, automatic payment methods) and
      returns { clientSecret, paymentIntentId } for the embedded Payment
      Element on the client. Amount is validated server-side; user must
      exist. A pending user_transactions row is NOT created here — the
      confirm step is the single source of truth so abandoned intents
      leave no residue.

  - confirm { paymentIntentId }
      Retrieves the PaymentIntent from Stripe with the SECRET key (never
      trusting the client's claim), and if status === 'succeeded' credits
      the user's balance exactly once (idempotent on reference_id = the
      PaymentIntent id, same pattern as the PayU webhook).

  Talks to Stripe's REST API directly — no SDK dependency in Deno.
*/
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { clientIp, throttle, tooManyRequests, originAllowed } from '../_shared/auth-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STRIPE_API = 'https://api.stripe.com/v1';

const MIN_CZK = 50;
const MAX_CZK = 200_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* Live CZK→EUR rate. Deposits are charged in EUR (so EUR-only methods
   like Pay by Bank / SEPA surface), but the wallet is still denominated
   in CZK — the user types a CZK amount, we convert it to EUR only for
   the Stripe charge, and credit back the exact CZK amount on confirm.
   frankfurter.app is a free, keyless ECB-data proxy. Falls back to a
   fixed rate if it's unreachable so a deposit never hard-fails on an
   FX-API outage. */
const FALLBACK_CZK_PER_EUR = 24.37;

async function getCzkPerEur(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const body = await res.json();
      const rate = Number(body?.rates?.CZK);
      if (Number.isFinite(rate) && rate > 10 && rate < 40) return rate;
    }
  } catch {
    /* network/timeout — fall through to the fixed rate */
  }
  return FALLBACK_CZK_PER_EUR;
}

async function stripeFetch(
  key: string,
  path: string,
  method: 'GET' | 'POST',
  form?: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!originAllowed(req)) {
    return json({ error: 'Origin not allowed', code: 'ORIGIN_BLOCKED' }, 403);
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    console.error('[stripe-payment] STRIPE_SECRET_KEY not configured');
    return json({ error: 'Payments are not configured' }, 500);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const action = String(payload?.action || '');
  const ip = clientIp(req);

  /* ── create_intent ─────────────────────────────────────────────── */
  if (action === 'create_intent') {
    const t = await throttle(supabase, ip, 'stripe_create_intent', 15, 300);
    if (t.limited) return tooManyRequests(t.retryAfter);

    const amount = Math.round(Number(payload?.amount));
    const userId = String(payload?.userId || '');
    const steamId = String(payload?.steamId || '');

    if (!Number.isFinite(amount) || amount < MIN_CZK || amount > MAX_CZK) {
      return json({ error: `Amount must be between ${MIN_CZK} and ${MAX_CZK} CZK` }, 400);
    }
    if (!/^[a-f0-9-]{36}$/.test(userId)) {
      return json({ error: 'Invalid userId' }, 400);
    }
    if (!/^\d{17}$/.test(steamId)) {
      return json({ error: 'Invalid steamId' }, 400);
    }

    /* User must exist and match the steam id — stops crediting arbitrary
       accounts by guessing UUIDs. */
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, steam_id')
      .eq('id', userId)
      .eq('steam_id', steamId)
      .maybeSingle();
    if (userErr || !userRow) {
      return json({ error: 'User not found' }, 404);
    }

    /* Convert the CZK amount the user typed into EUR cents for the
       Stripe charge. Rate is recorded in metadata for auditability, but
       the credit on confirm reads `amount_czk` (the exact typed amount),
       NOT a reverse EUR→CZK conversion — so the user always gets back
       precisely what the UI promised, with no double-rounding drift. */
    const czkPerEur = await getCzkPerEur();
    const amountEurCents = Math.round((amount / czkPerEur) * 100);
    /* Stripe's per-transaction minimum is ~0.50 EUR; MIN_CZK (50) is
       always well above that, so no extra guard needed here. */

    const { ok, status, body } = await stripeFetch(stripeKey, '/payment_intents', 'POST', {
      amount: String(amountEurCents),
      currency: 'eur',
      'automatic_payment_methods[enabled]': 'true',
      description: `Skinify wallet top-up ${amount} CZK`,
      'metadata[user_id]': userId,
      'metadata[steam_id]': steamId,
      'metadata[amount_czk]': String(amount),
      'metadata[czk_per_eur]': String(czkPerEur),
    });

    if (!ok) {
      console.error('[stripe-payment] create failed:', status, JSON.stringify(body?.error || body).slice(0, 500));
      return json({ error: body?.error?.message || 'Stripe rejected the payment intent' }, 502);
    }

    return json({
      clientSecret: body.client_secret,
      paymentIntentId: body.id,
      amount,
    });
  }

  /* ── confirm ───────────────────────────────────────────────────── */
  if (action === 'confirm') {
    const t = await throttle(supabase, ip, 'stripe_confirm', 30, 300);
    if (t.limited) return tooManyRequests(t.retryAfter);

    const piId = String(payload?.paymentIntentId || '');
    if (!/^pi_[A-Za-z0-9]+$/.test(piId)) {
      return json({ error: 'Invalid paymentIntentId' }, 400);
    }

    /* Server-side truth: fetch the intent from Stripe. */
    const { ok, body: pi } = await stripeFetch(stripeKey, `/payment_intents/${piId}`, 'GET');
    if (!ok || !pi?.id) {
      return json({ error: 'Payment not found' }, 404);
    }

    if (pi.status !== 'succeeded') {
      return json({ status: pi.status, credited: false });
    }

    const userId = pi.metadata?.user_id;
    /* Credit the CZK amount the user originally typed (stored in
       metadata at create time), NOT pi.amount — the intent is now
       charged in EUR, so pi.amount is EUR cents. Reading amount_czk
       gives the user back exactly what the deposit UI promised, with no
       EUR→CZK reverse-conversion drift. Legacy CZK-charged intents
       (created before the EUR switch) have no amount_czk metadata, so
       fall back to pi.amount for those. */
    const amountCzk = Math.round(Number(pi.metadata?.amount_czk ?? (pi.amount_received ?? pi.amount) / 100));
    if (!userId || !/^[a-f0-9-]{36}$/.test(userId) || !(amountCzk > 0)) {
      console.error('[stripe-payment] succeeded intent missing metadata:', piId);
      return json({ error: 'Payment metadata invalid' }, 400);
    }

    /* Idempotency — one credit per PaymentIntent, ever. */
    const { data: existing } = await supabase
      .from('user_transactions')
      .select('id')
      .eq('reference_id', piId)
      .maybeSingle();
    if (existing) {
      return json({ status: 'succeeded', credited: true, duplicate: true });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, steam_id, current_balance')
      .eq('id', userId)
      .maybeSingle();
    if (userError || !userData) {
      console.error('[stripe-payment] user not found for intent:', piId, userId);
      return json({ error: 'User not found' }, 404);
    }

    const currentBalance = Number(userData.current_balance || 0);
    const newBalance = currentBalance + amountCzk;

    /* Transaction row FIRST (unique reference guards double-credit if two
       confirms race), then the balance update. */
    const { error: txError } = await supabase.from('user_transactions').insert({
      user_id: userId,
      steam_id: userData.steam_id,
      type: 'deposit',
      amount: amountCzk,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: `Stripe deposit - ${amountCzk.toLocaleString()} Kč`,
      reference_id: piId,
      payment_method: 'stripe',
      metadata: { payment_intent: piId, livemode: pi.livemode },
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    if (txError) {
      /* Unique violation → a parallel confirm already credited. */
      if (String(txError.code) === '23505') {
        return json({ status: 'succeeded', credited: true, duplicate: true });
      }
      console.error('[stripe-payment] tx insert failed:', txError.message);
      return json({ error: 'Failed to record transaction' }, 500);
    }

    const { error: balanceError } = await supabase
      .from('users')
      .update({ current_balance: newBalance })
      .eq('id', userId);
    if (balanceError) {
      console.error('[stripe-payment] balance update failed:', balanceError.message);
      return json({ error: 'Failed to credit balance' }, 500);
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payment',
      title: 'Deposit Successful',
      message: `Your deposit of ${amountCzk.toLocaleString()} Kč has been credited to your account.`,
      data: { amount: amountCzk, paymentIntent: piId, paymentMethod: 'stripe' },
    }).then(({ error }) => {
      if (error) console.error('[stripe-payment] notification failed:', error.message);
    });

    console.log(`[stripe-payment] credited ${amountCzk} CZK to ${userId} (${piId})`);
    return json({ status: 'succeeded', credited: true, amount: amountCzk, newBalance });
  }

  return json({ error: 'Unknown action' }, 400);
});
