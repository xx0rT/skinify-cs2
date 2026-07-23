/*
  stripe-connect — Stripe Connect onboarding + payouts for sellers.

  Part of the Connect migration: instead of a seller's cut of a sale
  living forever as a number in users.pending_balance/current_balance
  waiting on a manual admin-triggered bank transfer, a seller can
  onboard a real Stripe connected account (v2 Accounts API, recipient
  configuration) and get paid out directly by Stripe.

  Onboarding is opt-in and lazy — triggered the first time a user tries
  to withdraw, never required just to buy/sell/list. Users who never
  onboard keep using the existing current_balance / withdraw_requests
  flow untouched (see withdraw-submit / withdraw-review).

  IMPORTANT — API version split:
    - Account + Account Link creation uses the v2 Accounts API
      (POST https://api.stripe.com/v2/core/...), which requires a
      `Stripe-Version` header and a JSON (not form-encoded) body. This
      Stripe account has v1 account creation disabled — confirmed live
      via a test call that returned "Stripe no longer recommends
      Accounts v1 for new Connect integrations... enable Accounts v1
      support in the Dashboard" — so v2 is not optional here.
    - Balance/Payout creation still uses the v1 REST API (form-encoded,
      no Stripe-Version header) scoped to the connected account via a
      `Stripe-Account` header — v1 resource calls against a v2-created
      account are explicitly supported by Stripe.

  Actions (POST JSON { action, steamId, ... }):
    - { action: 'get_status' }
        Returns this user's stripe_connect_accounts row, or
        { onboarding_status: 'not_started' } if none exists.
    - { action: 'start_onboarding', userId }
        Creates the v2 Account (if none exists yet) + an Account Link,
        returns { url } for the client to redirect to.
    - { action: 'refresh_status' }
        Re-fetches the Account from Stripe and updates our cached
        payouts_enabled/details_submitted/onboarding_status. Called
        when the user returns from the hosted onboarding flow.
    - { action: 'payout', amount }
        Creates a Payout on the user's connected account for `amount`
        CZK, provided their Connect balance covers it.
*/
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { clientIp, throttle, tooManyRequests, originAllowed } from '../_shared/auth-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-steam-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STRIPE_V1 = 'https://api.stripe.com/v1';
const STRIPE_V2 = 'https://api.stripe.com/v2';
/* Dated preview version required on every v2 call — confirmed via a
   live test request against this Stripe account. Stripe's v2 surface
   is still evolving; bump this if Stripe deprecates the version. */
const STRIPE_VERSION = '2026-06-24.preview';

const MIN_PAYOUT_CZK = 100;
const RETURN_PATH = '/profile?tab=settings&sub=payouts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* v1 REST — form-encoded, no Stripe-Version header (matches
   stripe-payment/index.ts's existing helper). Used for Balance/Payout
   calls, optionally scoped to a connected account via `stripeAccount`. */
async function stripeV1(
  key: string,
  path: string,
  method: 'GET' | 'POST',
  form?: Record<string, string>,
  stripeAccount?: string,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${STRIPE_V1}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(stripeAccount ? { 'Stripe-Account': stripeAccount } : {}),
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/* v2 core API — JSON body + mandatory Stripe-Version header. */
async function stripeV2(
  key: string,
  path: string,
  method: 'GET' | 'POST',
  jsonBody?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${STRIPE_V2}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': STRIPE_VERSION,
      'Content-Type': 'application/json',
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
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
    console.error('[stripe-connect] STRIPE_SECRET_KEY not configured');
    return json({ error: 'Payments are not configured' }, 500);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const steamId = req.headers.get('x-steam-id');
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return json({ error: 'x-steam-id header required (17-digit Steam ID).' }, 400);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const action = String(payload?.action || '');
  const ip = clientIp(req);

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id, steam_id, email')
    .eq('steam_id', steamId)
    .maybeSingle();
  if (userErr || !userRow) {
    return json({ error: 'User not found' }, 404);
  }
  /* Steam-only accounts never collect a real email — v2 recipient
     accounts require a contact_email regardless, so fall back to a
     deterministic per-user placeholder (same @skinify.gg convention
     used elsewhere for Steam-only accounts, e.g. deposit receipts). */
  const contactEmail = userRow.email || `user_${steamId}@skinify.gg`;

  /* ── get_status ────────────────────────────────────────────────── */
  if (action === 'get_status') {
    const { data: acct } = await supabase
      .from('stripe_connect_accounts')
      .select('onboarding_status, payouts_enabled, details_submitted, country')
      .eq('user_id', userRow.id)
      .maybeSingle();
    return json({ data: acct || { onboarding_status: 'not_started' } });
  }

  /* ── start_onboarding ──────────────────────────────────────────── */
  if (action === 'start_onboarding') {
    const t = await throttle(supabase, ip, 'stripe_connect_onboard', 10, 300);
    if (t.limited) return tooManyRequests(t.retryAfter);

    let stripeAccountId: string;
    const { data: existing } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, onboarding_status')
      .eq('user_id', userRow.id)
      .maybeSingle();

    if (existing?.stripe_account_id) {
      stripeAccountId = existing.stripe_account_id;
    } else {
      /* Recipient-configured v2 Account: can receive Transfers from the
         platform, but never accepts card payments directly (Skinify's
         main account does that). Requesting `stripe_transfers` is
         enough — Stripe automatically provisions a Stripe balance (and
         with it, payout capability) for a recipient account once that
         capability is requested; `payouts` is not itself a valid
         sub-field of recipient.capabilities.stripe_balance (confirmed
         via a live 400: "Unknown field" — it only appears in the
         `merchant` configuration, which this account doesn't need). */
      /* entity_type: 'individual' — sellers here are private people
         cashing out skin sales, not registered businesses. Without this,
         Stripe defaults toward a company-shaped account and immediately
         lists "Provide a business website" / "Provide a business type"
         as past-due requirements the seller can never actually satisfy
         (confirmed live: a test account created without this field sat
         Restricted with those two as blocking requirements). */
      const { ok, status, body } = await stripeV2(stripeKey, '/core/accounts', 'POST', {
        display_name: `Skinify seller ${steamId}`,
        contact_email: contactEmail,
        identity: { country: 'cz', entity_type: 'individual' },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        /* Stripe requires these once stripe_transfers is requested:
           `dashboard: 'none'` — the seller never logs into a Stripe
           Dashboard, they only ever see Skinify's own UI (this is the
           Express-equivalent choice in v2's model). `responsibilities`
           says WHO eats Stripe's own fees/chargeback losses on this
           account — Skinify (the platform) does, same as v1 Express. */
        dashboard: 'none',
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        include: ['configuration.recipient', 'requirements'],
      });
      if (!ok) {
        console.error('[stripe-connect] account create failed:', status, JSON.stringify(body?.error || body).slice(0, 500));
        return json({ error: body?.error?.message || 'Stripe rejected the account' }, 502);
      }
      stripeAccountId = body.id;

      const { error: insertErr } = await supabase.from('stripe_connect_accounts').insert({
        user_id: userRow.id,
        user_steam_id: steamId,
        stripe_account_id: stripeAccountId,
        onboarding_status: 'pending',
        country: 'cz',
      });
      if (insertErr) {
        console.error('[stripe-connect] failed to persist account row:', insertErr.message);
        return json({ error: 'Failed to save account' }, 500);
      }
    }

    const origin = req.headers.get('origin') || 'https://skinify.gg';
    const { ok, status, body } = await stripeV2(stripeKey, '/core/account_links', 'POST', {
      account: stripeAccountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          return_url: `${origin}${RETURN_PATH}`,
          refresh_url: `${origin}${RETURN_PATH}`,
        },
      },
    });
    if (!ok) {
      console.error('[stripe-connect] account link failed:', status, JSON.stringify(body?.error || body).slice(0, 500));
      return json({ error: body?.error?.message || 'Could not start onboarding' }, 502);
    }

    return json({ url: body.url });
  }

  /* ── refresh_status ────────────────────────────────────────────── */
  if (action === 'refresh_status') {
    const { data: acct } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('user_id', userRow.id)
      .maybeSingle();
    if (!acct?.stripe_account_id) {
      return json({ data: { onboarding_status: 'not_started' } });
    }

    /* `include` must be repeated query params, not a comma-joined
       value — confirmed via a live 400 ("Unrecognized enum value
       'configuration.recipient,requirements'"). */
    const { ok, status: sStatus, body } = await stripeV2(
      stripeKey,
      `/core/accounts/${acct.stripe_account_id}?include=configuration.recipient&include=requirements`,
      'GET',
    );
    if (!ok) {
      console.error('[stripe-connect] refresh_status GET failed:', sStatus, JSON.stringify(body?.error || body).slice(0, 800));
      return json({ error: 'Could not refresh account status' }, 502);
    }

    const recipientConfig = body?.configuration?.recipient;
    const payoutsEnabled = !!recipientConfig?.capabilities?.stripe_balance?.payouts?.status
      && recipientConfig.capabilities.stripe_balance.payouts.status === 'active';
    const detailsSubmitted = (body?.requirements?.currently_due?.length ?? 1) === 0;
    const onboardingStatus = payoutsEnabled
      ? 'complete'
      : (body?.requirements?.currently_due?.length ?? 0) > 0 && detailsSubmitted
      ? 'restricted'
      : 'pending';

    await supabase
      .from('stripe_connect_accounts')
      .update({
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        onboarding_status: onboardingStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userRow.id);

    return json({
      data: { onboarding_status: onboardingStatus, payouts_enabled: payoutsEnabled, details_submitted: detailsSubmitted },
    });
  }

  /* ── get_balance ───────────────────────────────────────────────── */
  if (action === 'get_balance') {
    const { data: acct } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', userRow.id)
      .maybeSingle();
    if (!acct?.stripe_account_id || !acct.payouts_enabled) {
      return json({ data: { available_czk: 0, pending_czk: 0 } });
    }

    const { ok, body } = await stripeV1(stripeKey, '/balance', 'GET', undefined, acct.stripe_account_id);
    if (!ok) return json({ error: 'Could not fetch your Stripe balance' }, 502);

    const sumCzk = (rows: any[]) =>
      (rows || []).filter((b: any) => b.currency === 'czk').reduce((sum: number, b: any) => sum + b.amount, 0) / 100;

    return json({
      data: {
        available_czk: sumCzk(body?.available),
        pending_czk: sumCzk(body?.pending),
      },
    });
  }

  /* ── payout ────────────────────────────────────────────────────── */
  if (action === 'payout') {
    const t = await throttle(supabase, ip, 'stripe_connect_payout', 10, 300);
    if (t.limited) return tooManyRequests(t.retryAfter);

    const amount = Math.round(Number(payload?.amount));
    if (!Number.isFinite(amount) || amount < MIN_PAYOUT_CZK) {
      return json({ error: `Minimum payout is ${MIN_PAYOUT_CZK} CZK.` }, 400);
    }

    const { data: acct } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', userRow.id)
      .maybeSingle();
    if (!acct?.stripe_account_id || !acct.payouts_enabled) {
      return json({ error: 'Your Stripe payout setup is not complete yet.' }, 400);
    }

    /* Verify the connected account's available Stripe balance actually
       covers this payout — never trust the client's claimed amount. */
    const { ok: balOk, body: balBody } = await stripeV1(
      stripeKey,
      '/balance',
      'GET',
      undefined,
      acct.stripe_account_id,
    );
    if (!balOk) {
      return json({ error: 'Could not verify your Stripe balance' }, 502);
    }
    const availableCzk = (balBody?.available || [])
      .filter((b: any) => b.currency === 'czk')
      .reduce((sum: number, b: any) => sum + b.amount, 0) / 100;
    if (availableCzk < amount) {
      return json(
        { error: `Your available Stripe balance (${availableCzk} CZK) is less than the requested payout.` },
        400,
      );
    }

    const { ok, status, body } = await stripeV1(
      stripeKey,
      '/payouts',
      'POST',
      { amount: String(amount * 100), currency: 'czk' },
      acct.stripe_account_id,
    );
    if (!ok) {
      console.error('[stripe-connect] payout failed:', status, JSON.stringify(body?.error || body).slice(0, 500));
      return json({ error: body?.error?.message || 'Payout failed' }, 502);
    }

    console.log(`[stripe-connect] payout ${amount} CZK created for ${steamId}: ${body.id}`);
    return json({ data: { payoutId: body.id, amount, status: body.status } });
  }

  return json({ error: 'Unknown action' }, 400);
});
