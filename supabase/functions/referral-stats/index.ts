/*
  referral-stats — data for the profile Referral tab.

  Same trust model as dm-list: the caller identifies via x-steam-id and we
  only return rows where they are the REFERRER. Service role is needed
  because referrals + other users' transactions are RLS-protected.

  GET → {
    referrals: [{ steamId, name, avatar, registeredAt, spent, sold, commission }],
    totals: { count, spent, commission }
  }

  commission = 25 % of the 2 % seller fee on the referred user's completed
  sales (the "25 % of every friend's seller fee" promise).
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const SELLER_FEE = 0.02;
const COMMISSION_SHARE = 0.25;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'GET') return json(405, { error: 'Use GET.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured.' });
  const supabase = createClient(supabaseUrl, serviceKey);

  const mySteamId = req.headers.get('x-steam-id');
  if (!mySteamId || !/^\d{17}$/.test(mySteamId)) {
    return json(400, { error: 'x-steam-id header required (17-digit Steam ID).' });
  }

  try {
    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('steam_id', mySteamId)
      .maybeSingle();
    if (!me) return json(200, { referrals: [], totals: { count: 0, spent: 0, commission: 0 } });

    const { data: refs, error } = await supabase
      .from('referrals')
      .select('referred_id, status, registered_at, created_at, referred:referred_id (steam_id, display_name, avatar_url, created_at)')
      .eq('referrer_id', me.id)
      .not('referred_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return json(500, { error: error.message });

    const rows: any[] = [];
    let totalSpent = 0;
    let totalCommission = 0;

    for (const r of refs || []) {
      const u: any = r.referred;
      if (!u?.steam_id) continue;
      const { data: txs } = await supabase
        .from('user_transactions')
        .select('type, amount, status')
        .eq('steam_id', u.steam_id)
        .eq('status', 'completed')
        .limit(5000);
      let spent = 0;
      let sold = 0;
      for (const t of txs || []) {
        const amt = Math.abs(Number(t.amount || 0));
        if (t.type === 'purchase') spent += amt;
        if (t.type === 'sale') sold += amt;
      }
      const commission = sold * SELLER_FEE * COMMISSION_SHARE;
      totalSpent += spent;
      totalCommission += commission;
      rows.push({
        steamId: u.steam_id,
        name: u.display_name || u.steam_id,
        avatar: u.avatar_url || null,
        registeredAt: r.registered_at || u.created_at || r.created_at,
        status: r.status,
        spent,
        sold,
        commission,
      });
    }

    return json(200, {
      referrals: rows,
      totals: { count: rows.length, spent: totalSpent, commission: totalCommission },
    });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
