/*
  withdraw-review — admin approves or rejects a withdrawal request.

  Request:
    POST /functions/v1/withdraw-review
    Headers:
      Content-Type: application/json
      x-admin-steam-id: <admin's steam id>
    Body:
      { "request_id": 123, "action": "approve" | "reject", "reason": "..." }

  On approve:
    - Withdrawal request row flipped to status='approved'.
    - The user's balance stays deducted (money is effectively paid out).
    - Admin does the actual payout externally (bank, crypto, etc.).

  On reject:
    - Request row flipped to status='rejected'.
    - A refund transaction credits the user's balance back.

  Auth: the x-admin-steam-id header must match the hardcoded admin
  allowlist. This mirrors the client-side useAdminAuth() gate so the
  server can never be bypassed even with a spoofed header from a
  non-admin steamId.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-steam-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

/* Same allowlist as src/hooks/useAdminAuth.ts. Keep in sync when
   admins are added or removed. */
const ADMIN_STEAM_IDS = new Set(['76561198021723640', '76561198156985354']);

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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(405, { error: { code: 'method_not_allowed', message: 'Use GET or POST.' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: { code: 'config', message: 'Server misconfigured.' } });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const adminSteamId = req.headers.get('x-admin-steam-id');
  if (!adminSteamId || !ADMIN_STEAM_IDS.has(adminSteamId)) {
    return json(403, { error: { code: 'forbidden', message: 'Admin access required.' } });
  }

  /* GET — list requests for the admin panel. The table's RLS only
     grants SELECT to authenticated users, and Steam-auth admins run on
     the anon key, so the panel reads through this service-role path
     (which also keeps payout details off the public API). */
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    let query = supabase
      .from('withdraw_requests')
      .select('*, users(display_name, steam_id)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      return json(500, { error: { code: 'db_error', message: error.message } });
    }
    return json(200, { data: data || [] });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: 'invalid_json', message: 'Body must be JSON.' } });
  }

  const requestId = Number(body?.request_id);
  const action = String(body?.action || '');
  const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return json(400, { error: { code: 'invalid_id', message: 'request_id must be a positive integer.' } });
  }
  if (action !== 'approve' && action !== 'reject') {
    return json(400, {
      error: { code: 'invalid_action', message: 'action must be "approve" or "reject".' },
    });
  }
  if (action === 'reject' && !reason) {
    return json(400, {
      error: { code: 'reason_required', message: 'Reason required when rejecting.' },
    });
  }

  const { data: reqRow, error: readErr } = await supabase
    .from('withdraw_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) {
    return json(500, { error: { code: 'db_error', message: readErr.message } });
  }
  if (!reqRow) {
    return json(404, { error: { code: 'not_found', message: 'Withdrawal request not found.' } });
  }
  if (reqRow.status !== 'pending') {
    return json(409, {
      error: {
        code: 'already_reviewed',
        message: `Request is already ${reqRow.status}.`,
      },
    });
  }

  const nowIso = new Date().toISOString();

  if (action === 'reject') {
    /* Credit the money back via a refund transaction. */
    const { error: refundErr } = await supabase.from('user_transactions').insert({
      user_id: reqRow.user_id,
      steam_id: reqRow.user_steam_id,
      type: 'refund',
      amount: reqRow.amount,
      description: `Withdrawal request #${reqRow.id} rejected — funds returned.`,
      reference_id: `withdrawal_refund_${reqRow.id}`,
      status: 'completed',
      completed_at: nowIso,
      metadata: {
        withdraw_request_id: reqRow.id,
        reason,
      },
    });
    if (refundErr) {
      return json(500, { error: { code: 'db_error', message: refundErr.message } });
    }

    await supabase.from('user_notifications').insert({
      user_steam_id: reqRow.user_steam_id,
      type: 'info',
      title: 'Withdrawal rejected',
      message: `Your withdrawal of ${reqRow.amount} CZK was rejected. ${reason ? 'Reason: ' + reason : ''} Funds returned to your balance.`,
      action_url: '/profile?tab=balance',
      metadata: { withdraw_request_id: reqRow.id },
    });
  } else {
    /* On approve, no balance change (already deducted at submit).
       Admin does the actual payout externally. */
    await supabase.from('user_notifications').insert({
      user_steam_id: reqRow.user_steam_id,
      type: 'success',
      title: 'Withdrawal approved',
      message: `Your withdrawal of ${reqRow.amount} CZK (net ${reqRow.net_amount} CZK) was approved and is being processed.`,
      action_url: '/profile?tab=balance',
      metadata: { withdraw_request_id: reqRow.id },
    });
  }

  const { error: updateErr } = await supabase
    .from('withdraw_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reason,
      reviewed_by: adminSteamId,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', requestId);
  if (updateErr) {
    return json(500, { error: { code: 'db_error', message: updateErr.message } });
  }

  return json(200, {
    data: {
      id: requestId,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: adminSteamId,
      reviewed_at: nowIso,
    },
  });
});
