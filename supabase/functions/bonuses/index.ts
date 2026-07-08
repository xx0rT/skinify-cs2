/*
  bonuses — real bonus progress + claim flow for the Bonuses page.

  Steam-OpenID users hold no Supabase session, so this runs as
  service_role and is keyed by the X-Steam-Id header (same trust model as
  the rest of the platform). It computes each bonus's live progress from
  existing tables and records claims in user_bonus_claims so a completed
  one-time bonus stops being eligible and cooldown bonuses respect their
  window.

  GET  /            → { bonuses: [{ id, progress, target, unit, eligible,
                                    claimed, cooldownEndsAt, completed }] }
  POST / {action:'claim', bonus_id}
                    → { ok, reward, newBalance? }

  Bonus catalogue (kept in sync with BonusesPage OFFERS):
    daily   — login today                 → +50 Kč      (24h cooldown)
    weekly  — 1 completed trade this week  → +1.5% (credit est.) (7d)
    monthly — spend 1,500 Kč this month    → crate       (30d)
    streak  — 7 completed orders lifetime  → crate       (one-time)
    spend   — spend 500 Kč this week       → +5% credit  (7d)
    social  — share (self-attested)        → 100 Kč      (30d)
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

interface BonusDef {
  id: string;
  cooldownMs: number | null; // null = one-time (no repeat)
  target: number;
  unit: 'login' | 'trades' | 'czk' | 'share';
  rewardKind: 'credit' | 'crate';
  rewardCzk: number; // for credit rewards
}

const BONUSES: BonusDef[] = [
  { id: 'daily',   cooldownMs: DAY,       target: 1,    unit: 'login',  rewardKind: 'credit', rewardCzk: 50 },
  { id: 'weekly',  cooldownMs: 7 * DAY,   target: 1,    unit: 'trades', rewardKind: 'credit', rewardCzk: 30 },
  { id: 'monthly', cooldownMs: 30 * DAY,  target: 1500, unit: 'czk',    rewardKind: 'crate',  rewardCzk: 0 },
  { id: 'streak',  cooldownMs: null,      target: 7,    unit: 'trades', rewardKind: 'crate',  rewardCzk: 0 },
  { id: 'spend',   cooldownMs: 7 * DAY,   target: 500,  unit: 'czk',    rewardKind: 'credit', rewardCzk: 25 },
  { id: 'social',  cooldownMs: 30 * DAY,  target: 1,    unit: 'share',  rewardKind: 'credit', rewardCzk: 100 },
];

function startOfWeek(): Date {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}
function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured.' });
  const supabase = createClient(supabaseUrl, serviceKey);

  const steamId =
    req.headers.get('x-steam-id') || new URL(req.url).searchParams.get('steamId') || '';
  if (!/^\d{17}$/.test(steamId)) {
    return json(401, { error: 'Sign in with Steam to view bonuses.' });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('id, current_balance')
    .eq('steam_id', steamId)
    .maybeSingle();
  if (!userRow) return json(404, { error: 'User not found.' });

  // ── Compute live progress once, shared by GET + POST ──
  async function computeProgress(): Promise<Record<string, number>> {
    const weekIso = startOfWeek().toISOString();
    const monthIso = startOfMonth().toISOString();

    const [ordersWeek, ordersMonth, ordersAll] = await Promise.all([
      supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('buyer_steam_id', steamId)
        .gte('created_at', weekIso),
      supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('buyer_steam_id', steamId)
        .gte('created_at', monthIso),
      supabase
        .from('orders')
        .select('id, status')
        .eq('buyer_steam_id', steamId),
    ]);

    const weekCompletedTrades = (ordersWeek.data || []).filter(
      (o: any) => o.status === 'completed',
    ).length;
    const weekSpend = (ordersWeek.data || []).reduce(
      (s: number, o: any) => s + Number(o.total_amount || 0),
      0,
    );
    const monthSpend = (ordersMonth.data || []).reduce(
      (s: number, o: any) => s + Number(o.total_amount || 0),
      0,
    );
    const lifetimeCompleted = (ordersAll.data || []).filter(
      (o: any) => o.status === 'completed',
    ).length;

    return {
      daily: 1, // "logged in today" — reaching this endpoint counts
      weekly: weekCompletedTrades,
      monthly: monthSpend,
      streak: lifetimeCompleted,
      spend: weekSpend,
      social: 1, // self-attested share; claim is the attestation
    };
  }

  // Most recent claim per bonus.
  async function lastClaims(): Promise<Record<string, string>> {
    const { data } = await supabase
      .from('user_bonus_claims')
      .select('bonus_id, claimed_at')
      .eq('steam_id', steamId)
      .order('claimed_at', { ascending: false });
    const map: Record<string, string> = {};
    for (const row of data || []) {
      if (!map[row.bonus_id]) map[row.bonus_id] = row.claimed_at;
    }
    return map;
  }

  try {
    if (req.method === 'GET') {
      const [progress, claims] = await Promise.all([computeProgress(), lastClaims()]);
      const now = Date.now();
      const bonuses = BONUSES.map((b) => {
        const prog = Math.min(progress[b.id] ?? 0, b.target);
        const last = claims[b.id] ? new Date(claims[b.id]).getTime() : null;
        const cooldownEndsAt =
          last != null && b.cooldownMs != null ? new Date(last + b.cooldownMs).toISOString() : null;
        const onCooldown = last != null && b.cooldownMs != null && now < last + b.cooldownMs;
        // One-time bonus is permanently completed once claimed.
        const completed = b.cooldownMs == null && last != null;
        const met = (progress[b.id] ?? 0) >= b.target;
        const eligible = met && !onCooldown && !completed;
        return {
          id: b.id,
          progress: prog,
          target: b.target,
          unit: b.unit,
          eligible,
          claimed: !!last,
          completed,
          onCooldown,
          cooldownEndsAt,
          rewardKind: b.rewardKind,
          rewardCzk: b.rewardCzk,
        };
      });
      return json(200, { bonuses });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body?.action !== 'claim') return json(400, { error: 'Unknown action.' });
      const def = BONUSES.find((b) => b.id === body.bonus_id);
      if (!def) return json(400, { error: 'Unknown bonus.' });

      const [progress, claims] = await Promise.all([computeProgress(), lastClaims()]);
      const now = Date.now();
      const last = claims[def.id] ? new Date(claims[def.id]).getTime() : null;

      if (def.cooldownMs == null && last != null) {
        return json(409, { error: 'This bonus has already been completed.' });
      }
      if (last != null && def.cooldownMs != null && now < last + def.cooldownMs) {
        return json(409, { error: 'This bonus is on cooldown.' });
      }
      if ((progress[def.id] ?? 0) < def.target) {
        return json(409, { error: 'Requirement not met yet.' });
      }

      // Record the claim.
      const { error: claimErr } = await supabase.from('user_bonus_claims').insert({
        user_id: userRow.id,
        steam_id: steamId,
        bonus_id: def.id,
        reward_kind: def.rewardKind,
        reward_value: def.rewardCzk,
      });
      if (claimErr) return json(500, { error: claimErr.message });

      let newBalance: number | undefined;
      if (def.rewardKind === 'credit' && def.rewardCzk > 0) {
        // Credit current_balance directly + an audit transaction. We use
        // admin_adjustment (not deposit) so total_deposited isn't inflated.
        const current = Number(userRow.current_balance || 0);
        newBalance = current + def.rewardCzk;
        await supabase
          .from('users')
          .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', userRow.id);
        await supabase.from('user_transactions').insert({
          user_id: userRow.id,
          steam_id: steamId,
          type: 'admin_adjustment',
          amount: def.rewardCzk,
          description: `Bonus reward: ${def.id}`,
          reference_id: `bonus_${def.id}_${Date.now()}`,
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: { bonus_id: def.id, reward: 'credit' },
        });
      }

      return json(200, {
        ok: true,
        reward:
          def.rewardKind === 'crate'
            ? 'crate'
            : `${def.rewardCzk} Kč`,
        newBalance,
      });
    }

    return json(405, { error: 'Method not allowed.' });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
