/*
  Skinify api-keys edge function.

  Manages the developer API keys that the public-api function validates.
  All routes require an authenticated Supabase session (caller passes
  the user's access token via the Authorization header).

  Endpoints (verb + path):
    GET    /functions/v1/api-keys           — list the caller's keys (masked)
    POST   /functions/v1/api-keys           — create a new key (returns the
                                              FULL key once; subsequent
                                              reads return the masked form)
    DELETE /functions/v1/api-keys/:id       — revoke a key (sets is_active=false)

  Verification gate on create:
    A user must have lifetime deposits ≥ $10 USD (≈ 235 CZK at the
    static FX rate we mirror from the client) before a key can be
    issued. Keeps spam abuse off the public tier. Returns
    402 verification_required if not met.

  Storage:
    Full plaintext keys land in public.api_keys.key (random 32-byte
    hex token, see api_keys.sql migration). Future v2 may hash; for
    v1 we accept the trade-off because rate limit + revocation are
    the actual security controls and users can re-issue at will.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

/* Verification threshold mirrors the client-side check in
   SettingsTab. Keep these constants in sync — if the policy changes
   on one side, ship the matching change on the other in the same PR. */
const VERIFICATION_USD = 10;
const USD_RATE_FROM_CZK = 0.0426; // matches currencyStore + public-api
const VERIFICATION_CZK = VERIFICATION_USD / USD_RATE_FROM_CZK; // ≈ 234.74 CZK

const KEY_LIMIT_PER_USER = 5;

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sk_live_${hex}`;
}

function maskKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk_live_${'•'.repeat(24)}${last4}`;
}

interface AuthResolution {
  authUserId: string;
  userId: string;
  totalDepositedCzk: number;
}

/* Validate the incoming JWT and resolve the matching public.users row.
   Returns the auth uuid + the public.users.id (which api_keys.user_id
   references) and the lifetime CZK deposit total used for the
   verification gate. */
async function authenticate(
  req: Request,
  supabase: any,
): Promise<AuthResolution | { error: { status: number; code: string; message: string } }> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return { error: { status: 401, code: 'unauthenticated', message: 'Missing bearer token.' } };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return {
      error: { status: 401, code: 'invalid_token', message: 'Token rejected by Supabase Auth.' },
    };
  }
  const authUserId = userData.user.id;

  const { data: row, error: rowErr } = await supabase
    .from('users')
    .select('id, total_deposited')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (rowErr) {
    return { error: { status: 500, code: 'db_error', message: rowErr.message } };
  }
  if (!row) {
    return {
      error: {
        status: 404,
        code: 'user_not_found',
        message: 'No public.users row for this auth user. Finish onboarding first.',
      },
    };
  }
  return {
    authUserId,
    userId: row.id,
    totalDepositedCzk: Number(row.total_deposited || 0),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, {
      error: { code: 'config', message: 'Supabase config missing on server' },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const auth = await authenticate(req, supabase);
  if ('error' in auth) {
    return jsonResponse(auth.error.status, { error: auth.error });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/api-keys/, '').replace(/\/$/, '');

  /* ─── GET / — list caller's keys ──────────────────────────────── */
  if (req.method === 'GET' && (path === '' || path === '/')) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key, created_at, last_used_at, is_active')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });
    if (error) {
      return jsonResponse(500, { error: { code: 'db_error', message: error.message } });
    }
    const keys = (data || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      masked: maskKey(k.key),
      is_active: k.is_active,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    }));
    return jsonResponse(200, { data: keys });
  }

  /* ─── POST / — create a new key ────────────────────────────────── */
  if (req.method === 'POST' && (path === '' || path === '/')) {
    /* Verification gate. */
    if (auth.totalDepositedCzk < VERIFICATION_CZK) {
      const remaining = Math.max(0, VERIFICATION_CZK - auth.totalDepositedCzk);
      return jsonResponse(402, {
        error: {
          code: 'verification_required',
          message: `Verified accounts only. Deposit at least $${VERIFICATION_USD} USD lifetime to unlock API keys.`,
          remaining_czk: Math.ceil(remaining),
          threshold_usd: VERIFICATION_USD,
        },
      });
    }

    /* Per-user key cap. */
    const { count, error: countErr } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('is_active', true);
    if (countErr) {
      return jsonResponse(500, {
        error: { code: 'db_error', message: countErr.message },
      });
    }
    if ((count || 0) >= KEY_LIMIT_PER_USER) {
      return jsonResponse(409, {
        error: {
          code: 'key_limit_reached',
          message: `You can have up to ${KEY_LIMIT_PER_USER} active API keys. Revoke one first.`,
        },
      });
    }

    /* Parse + sanitise the requested key name. */
    let body: { name?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* empty body is fine, we'll default the name */
    }
    const name = (body.name || '').trim().slice(0, 64) || `Key ${(count || 0) + 1}`;

    /* Insert the new key. Loop on the (extremely unlikely) UNIQUE
       violation just in case the random space ever collides. */
    let inserted: any = null;
    let lastErr: string | undefined;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const fullKey = generateApiKey();
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: auth.userId,
          key: fullKey,
          name,
          is_active: true,
        })
        .select('id, name, key, created_at')
        .single();
      if (error) {
        if (error.code === '23505') {
          lastErr = error.message;
          continue;
        }
        return jsonResponse(500, {
          error: { code: 'db_error', message: error.message },
        });
      }
      inserted = data;
    }
    if (!inserted) {
      return jsonResponse(500, {
        error: { code: 'db_error', message: lastErr || 'Could not generate a unique key.' },
      });
    }

    /* IMPORTANT: this is the ONLY response that carries the full
       plaintext key. Every subsequent list call returns the masked
       form. Tell the caller to copy it now. */
    return jsonResponse(201, {
      data: {
        id: inserted.id,
        name: inserted.name,
        key: inserted.key,
        masked: maskKey(inserted.key),
        created_at: inserted.created_at,
      },
      meta: {
        message:
          'Copy this key now — for security, it will not be shown again. Listing the key later returns only the masked form.',
      },
    });
  }

  /* ─── DELETE /:id — revoke ─────────────────────────────────────── */
  if (req.method === 'DELETE') {
    const id = path.replace(/^\//, '');
    if (!id) {
      return jsonResponse(400, {
        error: { code: 'missing_id', message: 'Pass the key id in the URL.' },
      });
    }
    /* Soft-revoke: we flip is_active=false and keep the row for
       audit / last_used inspection. RLS would let us hard-delete via
       the user's session, but we want the trail. */
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', auth.userId);
    if (error) {
      return jsonResponse(500, { error: { code: 'db_error', message: error.message } });
    }
    return jsonResponse(200, { data: { id, revoked: true } });
  }

  return jsonResponse(405, {
    error: { code: 'method', message: 'Method/path not allowed.' },
  });
});
