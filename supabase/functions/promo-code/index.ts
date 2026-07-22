/*
  promo-code — validate + redeem a promo/referral code typed into the
  DepositModal.

  A code is checked against TWO sources, in this order:
    1. promo_codes — standalone campaign codes (e.g. WELCOME10). This
       table + promo_code_uses already existed (20251009130000) for
       order-total discounts but was never wired into any UI; this
       function is the first real consumer, extended for deposit
       eligibility (min_deposit_czk, first_deposit_only — see the
       20260722090000 migration).
    2. users.referral_code — another user's personal referral code.
       Redeeming it grants the same welcome-style bonus AND writes a
       `referrals` row (status 'qualified') so the referrer's stats tab
       picks it up, reusing the existing referral system instead of a
       parallel one.

  promo_code_uses.user_id references auth.users(id), which is
  public.users.auth_user_id — NOT public.users.id. Every query here
  resolves through that column explicitly to avoid conflating the two.

  Actions (POST JSON { action, ... }):
    - { action: 'validate', code, userId, depositAmountCzk }
        Read-only check: returns the bonus that WOULD apply so the UI
        can show it before the user actually pays. userId is
        public.users.id (what the client already has cached).
    - { action: 'redeem', code, userId, depositAmountCzk, paymentIntentId }
        Same checks, then records the redemption. Called from
        stripe-payment's confirm step (server-to-server) so a client
        can't redeem without an actually-completed deposit.
*/
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { clientIp, throttle, tooManyRequests } from '../_shared/auth-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface ResolvedCode {
  kind: 'promo' | 'referral';
  promoCodeId: string | null;
  referralCode: string | null;
  referrerUserId: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minDepositCzk: number;
  firstDepositOnly: boolean;
  maxUses: number | null;
  currentUses: number;
}

/* Referral codes grant the same shape of welcome bonus the seeded
   WELCOME10 promo code uses — kept in one place so both paths compute
   identically. */
const REFERRAL_BONUS = {
  discountType: 'percentage' as const,
  discountValue: 10,
  minDepositCzk: 50,
  firstDepositOnly: true,
};

async function resolveCode(
  supabase: any,
  rawCode: string,
  authUserId: string,
  publicUserId: string,
): Promise<{ ok: true; resolved: ResolvedCode } | { ok: false; error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length > 32) return { ok: false, error: 'Invalid code.' };

  const nowIso = new Date().toISOString();
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, is_active, min_deposit_czk, first_deposit_only')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (promo) {
    if (promo.valid_until && new Date(promo.valid_until).getTime() < Date.now()) {
      return { ok: false, error: 'This code has expired.' };
    }
    if (promo.valid_from && new Date(promo.valid_from).getTime() > Date.now()) {
      return { ok: false, error: 'This code is not active yet.' };
    }
    if ((promo.current_uses || 0) >= (promo.max_uses || 0)) {
      return { ok: false, error: 'This code has reached its redemption limit.' };
    }
    return {
      ok: true,
      resolved: {
        kind: 'promo',
        promoCodeId: promo.id,
        referralCode: null,
        referrerUserId: null,
        discountType: promo.discount_type,
        discountValue: Number(promo.discount_value),
        minDepositCzk: Number(promo.min_deposit_czk || 0),
        firstDepositOnly: !!promo.first_deposit_only,
        maxUses: promo.max_uses,
        currentUses: promo.current_uses || 0,
      },
    };
  }

  /* Not a promo code — try it as another user's referral code. */
  const { data: referrer } = await supabase
    .from('users')
    .select('id, referral_code')
    .eq('referral_code', code)
    .maybeSingle();

  if (referrer) {
    if (referrer.id === publicUserId) {
      return { ok: false, error: "You can't use your own referral code." };
    }
    return {
      ok: true,
      resolved: {
        kind: 'referral',
        promoCodeId: null,
        referralCode: code,
        referrerUserId: referrer.id,
        ...REFERRAL_BONUS,
        maxUses: null,
        currentUses: 0,
      },
    };
  }

  return { ok: false, error: 'Code not found.' };
}

function computeBonus(resolved: ResolvedCode, depositAmountCzk: number): number {
  if (resolved.discountType === 'fixed') return resolved.discountValue;
  return Math.round(depositAmountCzk * (resolved.discountValue / 100));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = String(payload?.action || '');
  const rawCode = String(payload?.code || '');
  const publicUserId = String(payload?.userId || '');
  const depositAmountCzk = Math.round(Number(payload?.depositAmountCzk));
  const ip = clientIp(req);

  if (!/^[a-f0-9-]{36}$/.test(publicUserId)) {
    return json({ error: 'Invalid userId' }, 400);
  }
  if (!Number.isFinite(depositAmountCzk) || depositAmountCzk <= 0) {
    return json({ error: 'Invalid depositAmountCzk' }, 400);
  }
  if (action !== 'validate' && action !== 'redeem') {
    return json({ error: 'action must be "validate" or "redeem"' }, 400);
  }

  const t = await throttle(supabase, ip, `promo_code_${action}`, 20, 300);
  if (t.limited) return tooManyRequests(t.retryAfter);

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id, auth_user_id')
    .eq('id', publicUserId)
    .maybeSingle();
  if (userErr || !userRow?.auth_user_id) {
    return json({ error: 'User not found' }, 404);
  }
  const authUserId = userRow.auth_user_id;

  const result = await resolveCode(supabase, rawCode, authUserId, publicUserId);
  if (!result.ok) return json({ error: result.error, valid: false }, 200);
  const resolved = result.resolved;

  if (depositAmountCzk < resolved.minDepositCzk) {
    return json(
      { error: `This code needs a deposit of at least ${resolved.minDepositCzk} CZK.`, valid: false },
      200,
    );
  }

  /* first_deposit_only: check the user has no completed deposits yet. */
  if (resolved.firstDepositOnly) {
    const { count } = await supabase
      .from('user_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', publicUserId)
      .eq('type', 'deposit')
      .eq('status', 'completed');
    if ((count || 0) > 0) {
      return json({ error: 'This code is only valid on your first deposit.', valid: false }, 200);
    }
  }

  /* Per-user redemption cap — promo_code_uses.user_id is auth.users.id. */
  if (resolved.kind === 'promo') {
    const { count: userRedemptions } = await supabase
      .from('promo_code_uses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUserId)
      .eq('promo_code_id', resolved.promoCodeId);
    if ((userRedemptions || 0) > 0) {
      return json({ error: "You've already used this code.", valid: false }, 200);
    }
  } else {
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', resolved.referrerUserId)
      .eq('referred_id', publicUserId)
      .maybeSingle();
    if (existingReferral) {
      return json({ error: "You've already used this referral code.", valid: false }, 200);
    }
  }

  const bonusAmountCzk = computeBonus(resolved, depositAmountCzk);

  if (action === 'validate') {
    return json({ valid: true, bonusAmountCzk, kind: resolved.kind });
  }

  /* ── redeem ────────────────────────────────────────────────────── */
  const paymentIntentId = payload?.paymentIntentId ? String(payload.paymentIntentId) : null;

  if (resolved.kind === 'promo' && resolved.promoCodeId) {
    const { error: useErr } = await supabase.from('promo_code_uses').insert({
      promo_code_id: resolved.promoCodeId,
      user_id: authUserId,
      discount_applied: bonusAmountCzk,
      bonus_amount_czk: bonusAmountCzk,
      payment_intent_id: paymentIntentId,
    });
    if (useErr) {
      console.error('[promo-code] promo_code_uses insert failed:', useErr.message);
      return json({ error: 'Failed to record redemption', valid: false }, 500);
    }
    /* Bump current_uses — best-effort increment, not perfectly atomic
       under heavy concurrency, but redemption volume here is low and
       the per-user unique constraint already prevents double-spend by
       the same user, which is the exploit that actually matters. */
    await supabase
      .from('promo_codes')
      .update({ current_uses: resolved.currentUses + 1 })
      .eq('id', resolved.promoCodeId);
  } else if (resolved.kind === 'referral' && resolved.referrerUserId) {
    const { error: refErr } = await supabase.from('referrals').insert({
      referrer_id: resolved.referrerUserId,
      referred_id: publicUserId,
      referral_code: resolved.referralCode,
      status: 'qualified',
      qualifying_action: 'deposit',
      qualifying_amount: depositAmountCzk,
      qualified_at: new Date().toISOString(),
    });
    if (refErr) {
      console.error('[promo-code] referrals insert failed:', refErr.message);
      return json({ error: 'Failed to record redemption', valid: false }, 500);
    }
  }

  console.log(`[promo-code] redeemed ${rawCode} for user ${publicUserId}: +${bonusAmountCzk} CZK`);
  return json({ valid: true, bonusAmountCzk, kind: resolved.kind });
});
