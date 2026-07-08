/*
  sumsub-kyc — identity verification (KYC) via Sumsub.

  Holds the Sumsub credentials server-side (never shipped to the browser):
    SUMSUB_APP_TOKEN   — e.g. sbx:... (sandbox) / prod token
    SUMSUB_SECRET_KEY  — used to HMAC-sign every Sumsub API request
    SUMSUB_BASE_URL    — optional, defaults to https://api.sumsub.com

  Every Sumsub request is signed: the signature is
    HMAC_SHA256(secret, ts + METHOD + path + body)
  sent with X-App-Token, X-App-Access-Sig, X-App-Access-Ts headers.

  Identity: the caller is resolved like the rest of the platform — Supabase
  JWT when present, else X-Steam-Id. The Sumsub externalUserId is the
  platform users.id so status maps back to one account.

  Actions (POST body):
    'access_token' → { token, userId }   start/continue verification in the
                                          WebSDK (creates the applicant if
                                          needed)
    'status'       → { status, verified } poll review result; flips
                                          users.kyc_verified on GREEN
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

const LEVEL_NAME = 'basic-kyc-level'; // default Sumsub level; override via env if needed.

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const BASE = Deno.env.get('SUMSUB_BASE_URL') || 'https://api.sumsub.com';
const APP_TOKEN = Deno.env.get('SUMSUB_APP_TOKEN') || '';
const SECRET = Deno.env.get('SUMSUB_SECRET_KEY') || '';
const LEVEL = Deno.env.get('SUMSUB_LEVEL_NAME') || LEVEL_NAME;

/* Signed fetch against the Sumsub API. */
async function sumsub(method: string, path: string, body?: unknown): Promise<Response> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = body ? JSON.stringify(body) : '';
  const sig = createHmac('sha256', SECRET)
    .update(ts + method.toUpperCase() + path + payload)
    .digest('hex');
  return fetch(BASE + path, {
    method,
    headers: {
      'X-App-Token': APP_TOKEN,
      'X-App-Access-Sig': sig,
      'X-App-Access-Ts': ts,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? payload : undefined,
  });
}

async function resolveUser(
  req: Request,
  supabase: any,
): Promise<{ id: string } | { error: { status: number; message: string } }> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) {
      const { data: row } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
      if (row) return { id: row.id };
    }
  }
  const steamId = req.headers.get('x-steam-id') || '';
  if (/^\d{17}$/.test(steamId)) {
    const { data: row } = await supabase.from('users').select('id').eq('steam_id', steamId).maybeSingle();
    if (row) return { id: row.id };
    return { error: { status: 404, message: 'User not found.' } };
  }
  return { error: { status: 401, message: 'Sign in to verify your identity.' } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });
  if (!APP_TOKEN || !SECRET) {
    return json(500, { error: 'Sumsub is not configured (SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY).' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const resolved = await resolveUser(req, supabase);
  if ('error' in resolved) return json(resolved.error.status, { error: resolved.error.message });
  const externalUserId = resolved.id;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  try {
    if (action === 'access_token') {
      // A short-lived token the WebSDK uses. Sumsub creates the applicant
      // lazily on first use of the token for this externalUserId + level.
      const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(LEVEL)}&ttlInSecs=600`;
      const res = await sumsub('POST', path, {});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return json(502, { error: data?.description || `Sumsub error ${res.status}` });
      }
      return json(200, { token: data.token, userId: externalUserId });
    }

    if (action === 'status') {
      // Look up the applicant by externalUserId and read its review status.
      const res = await sumsub(
        'GET',
        `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`,
      );
      if (res.status === 404) {
        return json(200, { status: 'not_started', verified: false });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json(502, { error: data?.description || `Sumsub error ${res.status}` });

      const reviewStatus = data?.review?.reviewStatus || 'init';
      const answer = data?.review?.reviewResult?.reviewAnswer || null; // GREEN / RED
      const verified = reviewStatus === 'completed' && answer === 'GREEN';

      if (verified) {
        await supabase
          .from('users')
          .update({ kyc_verified: true, kyc_verified_at: new Date().toISOString() })
          .eq('id', externalUserId);
      }
      return json(200, { status: reviewStatus, answer, verified });
    }

    return json(400, { error: `Unknown action "${action}".` });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
