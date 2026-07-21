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

/* See dm-send for CORS rationale. */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(405, {
      error: { code: 'method_not_allowed', message: 'Use GET or POST.' },
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

  /* POST — four actions, all requiring the caller to be a participant:
       { action: 'mark_read', peer }
         Persist read state so the unread badge doesn't come back on
         the next fetch. Scoped: only messages SENT TO the caller.
       { action: 'toggle_reaction', message_id, emoji }
         Add/remove the caller's steam_id from that emoji's array on
         the message's `reactions` jsonb. Either participant may react
         to either side's message (mirrors Instagram/iMessage).
       { action: 'set_money_offer_status', message_id, status }
         Money-offer lifecycle: pending -> accepted|rejected (by the
         RECIPIENT, i.e. the listing owner deciding whether to take the
         price) -> bought (by the SENDER, i.e. whoever is paying,
         and only once the recipient has accepted). Each transition is
         checked server-side against both the caller's role and the
         offer's current status so neither side can skip a step or act
         on the other's behalf. */
  if (req.method === 'POST') {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json(400, { error: { code: 'bad_json', message: 'Invalid JSON body.' } });
    }

    if (body?.action === 'set_money_offer_status') {
      const messageId = Number(body?.message_id);
      const nextStatus = String(body?.status || '');
      const ALLOWED_TRANSITIONS: Record<string, { from: string[]; who: 'sender' | 'recipient' }> = {
        /* Recipient (listing owner) decides whether to accept the price. */
        accepted: { from: ['pending'], who: 'recipient' },
        rejected: { from: ['pending'], who: 'recipient' },
        /* Only the sender (the one paying) can mark it bought, and only
           after the recipient has accepted — they can't skip straight
           from pending to bought. */
        bought: { from: ['accepted'], who: 'sender' },
      };
      const rule = ALLOWED_TRANSITIONS[nextStatus];
      if (!Number.isInteger(messageId) || !rule) {
        return json(400, {
          error: { code: 'bad_request', message: 'set_money_offer_status needs a valid message_id and status (accepted|rejected|bought).' },
        });
      }
      const { data: row, error: fetchErr } = await supabase
        .from('direct_messages')
        .select('id, from_steam_id, to_steam_id, text')
        .eq('id', messageId)
        .maybeSingle();
      if (fetchErr || !row) {
        return json(404, { error: { code: 'not_found', message: 'Message not found.' } });
      }
      const isSender = row.from_steam_id === mySteamId;
      const isRecipient = row.to_steam_id === mySteamId;
      if (!isSender && !isRecipient) {
        return json(403, { error: { code: 'forbidden', message: 'Not a participant in this thread.' } });
      }
      if ((rule.who === 'sender' && !isSender) || (rule.who === 'recipient' && !isRecipient)) {
        return json(403, {
          error: {
            code: 'forbidden',
            message:
              rule.who === 'recipient'
                ? 'Only the offer recipient can accept or reject it.'
                : 'Only the offer sender can mark it bought.',
          },
        });
      }
      const PREFIX = '__money_offer__:';
      if (!row.text?.startsWith(PREFIX)) {
        return json(400, { error: { code: 'not_money_offer', message: 'This message is not a money offer.' } });
      }
      let payload: any;
      try {
        payload = JSON.parse(row.text.slice(PREFIX.length));
      } catch {
        return json(400, { error: { code: 'bad_payload', message: 'Malformed money offer.' } });
      }
      const currentStatus = payload?.status || (payload?.bought ? 'bought' : 'pending');
      if (!rule.from.includes(currentStatus)) {
        return json(409, {
          error: { code: 'invalid_transition', message: `Cannot move from "${currentStatus}" to "${nextStatus}".` },
        });
      }
      payload.status = nextStatus;
      delete payload.bought; // superseded by status, drop the legacy flag
      const newText = `${PREFIX}${JSON.stringify(payload)}`;
      const { error: updateErr } = await supabase
        .from('direct_messages')
        .update({ text: newText })
        .eq('id', messageId);
      if (updateErr) {
        return json(500, { error: { code: 'db_error', message: updateErr.message } });
      }
      return json(200, { ok: true, text: newText });
    }

    if (body?.action === 'toggle_reaction') {
      const messageId = Number(body?.message_id);
      const emoji = String(body?.emoji || '');
      /* Small, fixed set — keeps the jsonb tidy and blocks arbitrary
         string injection into the reactions map. */
      const ALLOWED_EMOJI = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);
      if (!Number.isInteger(messageId) || !ALLOWED_EMOJI.has(emoji)) {
        return json(400, {
          error: { code: 'bad_request', message: 'toggle_reaction needs a valid message_id and emoji.' },
        });
      }
      const { data: row, error: fetchErr } = await supabase
        .from('direct_messages')
        .select('id, from_steam_id, to_steam_id, reactions')
        .eq('id', messageId)
        .maybeSingle();
      if (fetchErr || !row) {
        return json(404, { error: { code: 'not_found', message: 'Message not found.' } });
      }
      if (row.from_steam_id !== mySteamId && row.to_steam_id !== mySteamId) {
        return json(403, { error: { code: 'forbidden', message: 'Not a participant in this thread.' } });
      }
      const reactions: Record<string, string[]> = { ...(row.reactions || {}) };
      const current = new Set(reactions[emoji] || []);
      if (current.has(mySteamId)) {
        current.delete(mySteamId);
      } else {
        current.add(mySteamId);
      }
      if (current.size > 0) {
        reactions[emoji] = Array.from(current);
      } else {
        delete reactions[emoji];
      }
      const { error: updateErr } = await supabase
        .from('direct_messages')
        .update({ reactions })
        .eq('id', messageId);
      if (updateErr) {
        return json(500, { error: { code: 'db_error', message: updateErr.message } });
      }
      return json(200, { ok: true, reactions });
    }

    const markPeer = String(body?.peer || peer || '');
    if (body?.action !== 'mark_read' || !/^\d{17}$/.test(markPeer)) {
      return json(400, {
        error: { code: 'bad_request', message: "POST supports { action: 'mark_read', peer } or { action: 'toggle_reaction', message_id, emoji }." },
      });
    }
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('to_steam_id', mySteamId)
      .eq('from_steam_id', markPeer)
      .is('read_at', null);
    if (error) {
      return json(500, { error: { code: 'db_error', message: error.message } });
    }
    return json(200, { ok: true });
  }

  /* Both modes return the same shape — the client already parses this
     into DMMessage[] via the "srv_<id>" convention. */
  const columns =
    'id, from_steam_id, to_steam_id, text, item_id, item_name, item_image, attachments, read_at, reactions, created_at';

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
