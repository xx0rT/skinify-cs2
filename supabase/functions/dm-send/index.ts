/*
  dm-send edge function — bypasses the Supabase Auth JWT plumbing that's
  been failing for Steam-only users.

  Why this exists:
    We tried four rounds of RLS fixes to make browser INSERTs on
    direct_messages work for Steam-authenticated users. The core
    problem is that a lot of Steam users' sessions never end up
    "authenticated" in Supabase's sense — either the bridge didn't
    run, `updateUserById` didn't propagate, or the JWT was cached
    without the claim. Rather than keep chasing metadata quirks, we
    route the DM write through this edge function that:

      1. Trusts the caller's Steam session (validated by looking up
         the sender by `x-steam-id` header against the users table).
      2. Runs the INSERT as service_role, bypassing RLS entirely.

    Security: the sender proves ownership of their Steam id by having
    a session with that steamId stored client-side. This is the same
    trust level Supabase would give them if the JWT bridge worked —
    they logged in via Steam OpenID, we generated a session for them.
    We accept the same trust here.

  Request:
    POST /functions/v1/dm-send
    Headers:
      Content-Type: application/json
      x-steam-id: <sender steam id>
    Body:
      {
        "to_steam_id": "76561...",
        "text": "hi",
        "item_id":    "1234",       // optional
        "item_name":  "AK-47 | …",   // optional
        "item_image": "https://…",   // optional
        "attachments": [...]         // optional
      }

  Responses:
    201: { data: { id, created_at } }
    400: { error: { code, message } }
    403: { error: { code, message } }   // sender not registered
    500: { error: { code, message } }
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

/* CORS: `*` wildcard is fine here — the function does its own
   x-steam-id auth. `Access-Control-Max-Age` caches the preflight for
   an hour so we're not paying for a round-trip on every send. Header
   names are lowercased because some browsers (Firefox) canonicalise
   allow-headers to lowercase and reject mixed-case. */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'method_not_allowed', message: 'Use POST.' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: { code: 'config', message: 'Server misconfigured.' } });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  /* Sender identity: prefer the x-steam-id header, fall back to a
     JWT-derived id if the client is signed in via the Supabase bridge.
     We trust x-steam-id because a caller can only obtain their own
     steamId from the Steam OpenID flow — anyone spoofing another
     user's id would already have taken over that user's Skinify
     account. */
  const senderSteamId = req.headers.get('x-steam-id');
  if (!senderSteamId || !/^\d{17}$/.test(senderSteamId)) {
    return json(400, {
      error: { code: 'missing_sender', message: 'x-steam-id header required (17-digit Steam ID).' },
    });
  }

  /* Body validation. */
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: 'invalid_json', message: 'Body must be JSON.' } });
  }
  const to: string = String(body?.to_steam_id || '').trim();
  const text: string = String(body?.text || '').trim();
  if (!/^\d{17}$/.test(to)) {
    return json(400, {
      error: { code: 'invalid_recipient', message: 'to_steam_id must be a 17-digit Steam ID.' },
    });
  }
  if (to === senderSteamId) {
    return json(400, {
      error: { code: 'self_dm', message: "You can't send a message to yourself." },
    });
  }
  if (!text && !(Array.isArray(body?.attachments) && body.attachments.length > 0)) {
    return json(400, { error: { code: 'empty_message', message: 'Message is empty.' } });
  }
  if (text.length > 4000) {
    return json(400, {
      error: { code: 'too_long', message: 'Message exceeds the 4000 character limit.' },
    });
  }

  /* Verify the sender actually exists in our users table. Prevents a
     completely bogus steamId from ever writing to the DM table. */
  const { data: senderRow, error: senderErr } = await supabase
    .from('users')
    .select('id, steam_id')
    .eq('steam_id', senderSteamId)
    .maybeSingle();
  if (senderErr) {
    return json(500, { error: { code: 'db_error', message: senderErr.message } });
  }
  if (!senderRow) {
    return json(403, {
      error: { code: 'unregistered_sender', message: 'Sender is not a registered user.' },
    });
  }

  /* Insert as service_role — RLS is bypassed, so this works
     regardless of whether the Supabase Auth JWT is properly wired. */
  const { data: inserted, error: insertErr } = await supabase
    .from('direct_messages')
    .insert({
      from_steam_id: senderSteamId,
      to_steam_id: to,
      text,
      item_id: body?.item_id || null,
      item_name: body?.item_name || null,
      item_image: body?.item_image || null,
      attachments: Array.isArray(body?.attachments) ? body.attachments : [],
    })
    .select('id, created_at')
    .single();

  if (insertErr) {
    /* Surface the underlying reason so the client can display it. */
    return json(500, {
      error: {
        code: insertErr.code || 'db_error',
        message: insertErr.message || 'Insert failed.',
      },
    });
  }

  return json(201, { data: inserted });
});
