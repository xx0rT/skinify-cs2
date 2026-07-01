/*
  dm-list edge function — reads DMs bypassing RLS.

  Companion to dm-send. Same trust model: caller identifies themselves
  with the x-steam-id header; we scope the query so they can only
  read rows where they're a participant.

  Two modes based on query params:
    - ?peer=<steamid>            → single thread history (200 rows)
    - (no params, i.e. "inbox")  → last 500 messages the caller is a
                                    participant in, ordered by created_at
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, x-steam-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
  if (req.method !== 'GET') {
    return json(405, {
      error: { code: 'method_not_allowed', message: 'Use GET.' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, {
      error: { code: 'config', message: 'Server misconfigured.' },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const mySteamId = req.headers.get('x-steam-id');
  if (!mySteamId || !/^\d{17}$/.test(mySteamId)) {
    return json(400, {
      error: {
        code: 'missing_sender',
        message: 'x-steam-id header required (17-digit Steam ID).',
      },
    });
  }

  const url = new URL(req.url);
  const peer = url.searchParams.get('peer');

  /* Both modes return the same shape — the client already parses this
     into DMMessage[] via the "srv_<id>" convention. */
  const columns =
    'id, from_steam_id, to_steam_id, text, item_id, item_name, item_image, attachments, read_at, created_at';

  if (peer && /^\d{17}$/.test(peer)) {
    /* Single-thread mode. Two-sided filter — either direction. */
    const { data, error } = await supabase
      .from('direct_messages')
      .select(columns)
      .or(
        `and(from_steam_id.eq.${mySteamId},to_steam_id.eq.${peer}),and(from_steam_id.eq.${peer},to_steam_id.eq.${mySteamId})`,
      )
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      return json(500, { error: { code: 'db_error', message: error.message } });
    }
    return json(200, { data: data || [] });
  }

  /* Inbox mode. Every message where the caller is a participant. */
  const { data, error } = await supabase
    .from('direct_messages')
    .select(columns)
    .or(`from_steam_id.eq.${mySteamId},to_steam_id.eq.${mySteamId}`)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    return json(500, { error: { code: 'db_error', message: error.message } });
  }
  return json(200, { data: data || [] });
});
