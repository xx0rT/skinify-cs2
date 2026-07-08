/*
  admin-settings — service_role admin operations for the Settings tab.

  The admin panel's Steam-OpenID users hold no Supabase Auth session, so
  direct anon-key writes to RLS-protected tables (system_settings,
  promo_codes) return 401. This function runs as service_role and gates
  every operation behind a Steam-ID admin allowlist — the same trust
  model as withdraw-review.

  Auth: caller passes their Steam ID via the `X-Steam-Id` header (or
  `steamId` in the body). Must be in ADMIN_STEAM_IDS.

  POST / { action, ... }:
    'list_settings'                              → { settings: [...] }
    'save_setting'  { key, value, description?, category?, id? }
                                                 → { ok: true }
    'list_promos'                                → { promos: [...] }
    'create_promo'  { promo: {...} }             → { ok, promo }
    'toggle_promo'  { id, isActive }             → { ok: true }
    'delete_promo'  { id }                       → { ok: true }
    'today_stats'                                → { stats: {...} }
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

/* Keep in sync with withdraw-review's ADMIN_STEAM_IDS. */
const ADMIN_STEAM_IDS = new Set(['76561198021723640', '76561198156985354']);

function json(status: number, body: unknown) {
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
    return json(405, { error: 'Use POST.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Server misconfigured.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const steamId = req.headers.get('x-steam-id') || body?.steamId || '';
  if (!ADMIN_STEAM_IDS.has(steamId)) {
    return json(403, { error: 'Not authorized.' });
  }

  const action = body?.action as string;

  try {
    switch (action) {
      case 'list_settings': {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .order('category', { ascending: true });
        if (error) return json(500, { error: error.message });
        return json(200, { settings: data || [] });
      }

      case 'save_setting': {
        const { key, value, description, category, id } = body;
        if (!key) return json(400, { error: 'Missing key.' });
        if (id) {
          const { error } = await supabase
            .from('system_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) return json(500, { error: error.message });
        } else {
          // Upsert by key so the first edit seeds the row.
          const { error } = await supabase
            .from('system_settings')
            .upsert({ key, value, description, category }, { onConflict: 'key' });
          if (error) return json(500, { error: error.message });
        }
        return json(200, { ok: true });
      }

      case 'list_promos': {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return json(500, { error: error.message });
        return json(200, { promos: data || [] });
      }

      case 'create_promo': {
        const p = body.promo || {};
        if (!p.code) return json(400, { error: 'Missing code.' });
        const { data, error } = await supabase
          .from('promo_codes')
          .insert([
            {
              code: String(p.code).toUpperCase(),
              discount_type: p.discount_type,
              discount_value: p.discount_value,
              max_uses: p.max_uses,
              current_uses: 0,
              valid_from: p.valid_from,
              valid_until: p.valid_until,
              is_active: true,
            },
          ])
          .select()
          .maybeSingle();
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true, promo: data });
      }

      case 'toggle_promo': {
        const { id, isActive } = body;
        if (!id) return json(400, { error: 'Missing id.' });
        const { error } = await supabase
          .from('promo_codes')
          .update({ is_active: !isActive })
          .eq('id', id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      case 'delete_promo': {
        const { id } = body;
        if (!id) return json(400, { error: 'Missing id.' });
        const { error } = await supabase.from('promo_codes').delete().eq('id', id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      case 'today_stats': {
        // Replaces the missing get_today_stats RPC. Computes today's
        // dashboard counters directly. Field names match the JSX in
        // RemainingTabs' AnalyticsTab (total_visits, unique_visitors,
        // new_registrations, deposits_today, purchases_today, page_views,
        // clicks). user_activity may not exist on every deployment, so its
        // read is defensive — a failure just zeroes the traffic numbers.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const iso = startOfDay.toISOString();

        const [usersRes, activityRes] = await Promise.all([
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', iso),
          supabase
            .from('user_activity')
            .select('event_type, event_data, user_id')
            .gte('created_at', iso),
        ]);

        const activity = activityRes.data || [];
        const pageViews = activity.filter((a: any) => a.event_type === 'page_view').length;
        const clicks = activity.filter((a: any) => a.event_type === 'click').length;
        const uniqueVisitors = new Set(
          activity.map((a: any) => a.user_id).filter(Boolean),
        ).size;
        const depositsToday = activity
          .filter((a: any) => a.event_type === 'deposit')
          .reduce((s: number, a: any) => s + Number(a.event_data?.amount || 0), 0);
        const purchasesToday = activity
          .filter((a: any) => a.event_type === 'purchase')
          .reduce((s: number, a: any) => s + Number(a.event_data?.amount || 0), 0);

        return json(200, {
          stats: {
            total_visits: pageViews,
            page_views: pageViews,
            clicks,
            unique_visitors: uniqueVisitors,
            new_registrations: usersRes.count || 0,
            deposits_today: depositsToday,
            purchases_today: purchasesToday,
          },
        });
      }

      default:
        return json(400, { error: `Unknown action "${action}".` });
    }
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
