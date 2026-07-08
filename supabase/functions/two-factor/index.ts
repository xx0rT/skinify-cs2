/*
  Skinify two-factor edge function (TOTP / Google Authenticator).

  Steam-OpenID users hold no Supabase Auth session, so we can't lean on
  Supabase Auth's built-in MFA. This service_role function stores the
  TOTP secret + backup codes on public.users (keyed by steam_id) and
  verifies 6-digit codes server-side. Identity is resolved the same way
  the rest of the platform does: Supabase JWT when present, otherwise
  the X-Steam-Id header.

  Endpoints (all under /functions/v1/two-factor):
    GET  /                 → { enabled, hasPending }         status
    POST / { action: 'setup' }
                           → { secret, otpauth, qrSvg }      start enrollment
    POST / { action: 'enable',  code }
                           → { backupCodes }                 verify + activate
    POST / { action: 'disable', code }
                           → { ok: true }                    verify + clear
    POST / { action: 'verify',  code }
                           → { ok: true }                    login-time check
                             (code may be a TOTP or a backup code)

  Crypto: RFC 6238 TOTP over HMAC-SHA1, 30s step, 6 digits, ±1 window
  tolerance. Secret is base32 (RFC 4648, no padding). All primitives are
  Web Crypto — no npm deps beyond the Supabase client. The QR is emitted
  as an inline SVG string the client renders directly (no image host).
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, X-Steam-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ISSUER = 'Skinify';
const PERIOD = 30;
const DIGITS = 6;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* ───────────────────────── base32 (RFC 4648) ───────────────────────── */
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/* ───────────────────────── TOTP (RFC 6238) ─────────────────────────── */
async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  // 8-byte big-endian counter
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/* Verify a code against the secret with ±1 step tolerance to account
   for clock drift between the phone and the server. Constant work per
   window; not timing-safe but the search space is 10^6 and codes rotate
   every 30s, which is the standard TOTP threat posture. */
async function verifyTotp(secretB32: string, code: string): Promise<boolean> {
  const normalized = (code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  for (let w = -1; w <= 1; w++) {
    if ((await hotp(secret, counter + w)) === normalized) return true;
  }
  return false;
}

function randomSecret(): string {
  const bytes = new Uint8Array(20); // 160-bit, matches Google Authenticator
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    // Format as xxxx-xxxx for readability
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`.toUpperCase());
  }
  return codes;
}

function otpauthUri(secret: string, label: string): string {
  const account = encodeURIComponent(label || 'account');
  const issuer = encodeURIComponent(ISSUER);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

/* ───────────────────────── identity ─────────────────────────────── */
async function resolveUser(
  req: Request,
  supabase: any,
): Promise<{ id: string; steamId?: string } | { error: { status: number; message: string } }> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      const { data: row } = await supabase
        .from('users')
        .select('id, steam_id')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();
      if (row) return { id: row.id, steamId: row.steam_id };
    }
  }

  const steamId =
    req.headers.get('X-Steam-Id') || new URL(req.url).searchParams.get('steamId') || '';
  if (/^\d{17}$/.test(steamId)) {
    const { data: row } = await supabase
      .from('users')
      .select('id, steam_id')
      .eq('steam_id', steamId)
      .maybeSingle();
    if (row) return { id: row.id, steamId: row.steam_id };
    return { error: { status: 404, message: 'User not found for this Steam ID.' } };
  }

  return { error: { status: 401, message: 'Provide a Supabase bearer token or X-Steam-Id.' } };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const resolved = await resolveUser(req, supabase);
  if ('error' in resolved) {
    return jsonResponse(resolved.error.status, { error: resolved.error.message });
  }
  const userId = resolved.id;

  try {
    if (req.method === 'GET') {
      const { data: row } = await supabase
        .from('users')
        .select('totp_enabled, totp_secret')
        .eq('id', userId)
        .maybeSingle();
      return jsonResponse(200, {
        enabled: !!row?.totp_enabled,
        // A pending (not-yet-activated) secret exists but 2FA isn't on yet.
        hasPending: !!row?.totp_secret && !row?.totp_enabled,
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const action = body?.action as string;

      if (action === 'setup') {
        const { data: row } = await supabase
          .from('users')
          .select('totp_enabled, display_name')
          .eq('id', userId)
          .maybeSingle();
        if (row?.totp_enabled) {
          return jsonResponse(409, { error: 'Two-factor is already enabled.' });
        }
        const secret = randomSecret();
        // Store as pending (enabled stays false until a code is verified).
        const { error: upErr } = await supabase
          .from('users')
          .update({ totp_secret: secret, totp_enabled: false })
          .eq('id', userId);
        if (upErr) return jsonResponse(500, { error: upErr.message });

        const label = row?.display_name || resolved.steamId || 'account';
        const uri = otpauthUri(secret, label);
        // The client renders the QR from `otpauth` with the vendored
        // `qrcode` library (the app CSP blocks third-party image hosts,
        // so no external QR service). `secret` is shown for manual entry.
        return jsonResponse(200, { secret, otpauth: uri });
      }

      if (action === 'enable') {
        const code = String(body?.code || '');
        const { data: row } = await supabase
          .from('users')
          .select('totp_secret, totp_enabled')
          .eq('id', userId)
          .maybeSingle();
        if (!row?.totp_secret) {
          return jsonResponse(400, { error: 'Start setup before enabling.' });
        }
        if (row.totp_enabled) {
          return jsonResponse(409, { error: 'Two-factor is already enabled.' });
        }
        const ok = await verifyTotp(row.totp_secret, code);
        if (!ok) {
          return jsonResponse(400, { error: 'That code is incorrect or expired. Try again.' });
        }
        const backupCodes = generateBackupCodes();
        const { error: upErr } = await supabase
          .from('users')
          .update({
            totp_enabled: true,
            totp_enabled_at: new Date().toISOString(),
            totp_backup_codes: backupCodes,
          })
          .eq('id', userId);
        if (upErr) return jsonResponse(500, { error: upErr.message });
        return jsonResponse(200, { backupCodes });
      }

      if (action === 'disable') {
        const code = String(body?.code || '');
        const { data: row } = await supabase
          .from('users')
          .select('totp_secret, totp_enabled, totp_backup_codes')
          .eq('id', userId)
          .maybeSingle();
        if (!row?.totp_enabled) {
          return jsonResponse(400, { error: 'Two-factor is not enabled.' });
        }
        const codes: string[] = Array.isArray(row.totp_backup_codes) ? row.totp_backup_codes : [];
        const normalizedBackup = code.replace(/\s/g, '').toUpperCase();
        const okTotp = await verifyTotp(row.totp_secret, code);
        const okBackup = codes.includes(normalizedBackup);
        if (!okTotp && !okBackup) {
          return jsonResponse(400, { error: 'Enter a valid authenticator or backup code to disable.' });
        }
        const { error: upErr } = await supabase
          .from('users')
          .update({
            totp_enabled: false,
            totp_secret: null,
            totp_backup_codes: [],
            totp_enabled_at: null,
          })
          .eq('id', userId);
        if (upErr) return jsonResponse(500, { error: upErr.message });
        return jsonResponse(200, { ok: true });
      }

      if (action === 'verify') {
        // Login-time check. Accepts a TOTP or consumes a single-use
        // backup code (removes it from the stored list on success).
        const code = String(body?.code || '');
        const { data: row } = await supabase
          .from('users')
          .select('totp_secret, totp_enabled, totp_backup_codes')
          .eq('id', userId)
          .maybeSingle();
        if (!row?.totp_enabled || !row.totp_secret) {
          return jsonResponse(400, { error: 'Two-factor is not enabled.' });
        }
        if (await verifyTotp(row.totp_secret, code)) {
          return jsonResponse(200, { ok: true, method: 'totp' });
        }
        const codes: string[] = Array.isArray(row.totp_backup_codes) ? row.totp_backup_codes : [];
        const normalizedBackup = code.replace(/\s/g, '').toUpperCase();
        if (codes.includes(normalizedBackup)) {
          const remaining = codes.filter((c) => c !== normalizedBackup);
          await supabase.from('users').update({ totp_backup_codes: remaining }).eq('id', userId);
          return jsonResponse(200, { ok: true, method: 'backup', remaining: remaining.length });
        }
        return jsonResponse(400, { error: 'Invalid code.' });
      }

      return jsonResponse(400, { error: `Unknown action "${action}".` });
    }

    return jsonResponse(405, { error: 'Method not allowed.' });
  } catch (e) {
    return jsonResponse(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
