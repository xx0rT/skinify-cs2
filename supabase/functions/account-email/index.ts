/*
  account-email — custom email confirmation + password reset via Brevo.

  Credentials (email/password) signups should get their confirmation and
  password-reset emails from Brevo, our transactional sender, not from
  Supabase's built-in SMTP. This service_role function issues single-use
  tokens (email_tokens table), emails a branded link through Brevo, and
  verifies the tokens to confirm the address or set a new password via the
  Supabase admin API.

  POST / { action, ... }:
    'send_confirmation' { email, authUserId?, displayName? }
                        → emails a /auth/confirm?token=… link (24h)
    'confirm'           { token }
                        → marks the auth user email_confirmed
    'send_reset'        { email }
                        → emails a /auth/reset?token=… link (1h)
    'reset'             { token, newPassword }
                        → updates the user's password

  Secrets: BREVO_API_KEY (+ optional BREVO_SENDER_EMAIL / _NAME),
  APP_ORIGIN (default https://skinify.gg).
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { clientIp, throttle, tooManyRequests, originAllowed } from '../_shared/auth-guard.ts';

/* Per-action throttle budgets, keyed by caller IP. Tight on the
   attack-worthy actions (reset, signup, confirm/reset token guessing),
   generous on the harmless polling one (check_confirmed). */
const LIMITS: Record<string, { max: number; windowSec: number }> = {
  signup: { max: 5, windowSec: 600 },          // 5 accounts / 10 min / IP
  send_reset: { max: 5, windowSec: 900 },      // 5 reset mails / 15 min / IP
  send_confirmation: { max: 5, windowSec: 900 },
  reset: { max: 10, windowSec: 600 },          // 10 token tries / 10 min / IP
  confirm: { max: 20, windowSec: 600 },
  check_confirmed: { max: 60, windowSec: 60 }, // 1/sec poll
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || 'https://skinify.gg';

/* Branded transactional email shell. Inline styles only (email clients
   strip <style>), max-width container, Skinify accent button. */
function emailShell(opts: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:480px;width:100%;">
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:20px;font-weight:800;color:#111;">Skinify</div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;">
          <h1 style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px;">${opts.heading}</h1>
          <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">${opts.body}</p>
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:999px;">${opts.ctaLabel}</a>
          <p style="font-size:12px;line-height:1.6;color:#999;margin:24px 0 0;">${opts.footnote}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;">
          <p style="font-size:11px;color:#bbb;margin:16px 0 0;border-top:1px solid #eee;padding-top:16px;">
            If the button doesn't work, copy this link into your browser:<br>
            <span style="color:#888;word-break:break-all;">${opts.ctaUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

interface BrevoConfig {
  apiKey: string | null;
  senderEmail: string;
  senderName: string;
}

/* Resolve Brevo credentials. The DB override (system_settings key "brevo",
   value: { "api_key": "...", "sender_email": "...", "sender_name": "..." })
   takes precedence so the key can be fixed from Admin → Settings without
   CLI access to `supabase secrets`. Env vars remain the fallback. */
async function resolveBrevoConfig(supabase: any): Promise<BrevoConfig> {
  let db: any = {};
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'brevo')
      .maybeSingle();
    db = data?.value || {};
  } catch {
    /* table missing / row missing — fall through to env */
  }
  const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    apiKey: clean(db.api_key) || clean(Deno.env.get('BREVO_API_KEY')) || null,
    senderEmail: clean(db.sender_email) || clean(Deno.env.get('BREVO_SENDER_EMAIL')) || 'noreply@skinify.gg',
    senderName: clean(db.sender_name) || clean(Deno.env.get('BREVO_SENDER_NAME')) || 'Skinify',
  };
}

async function sendViaBrevo(cfg: BrevoConfig, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, senderEmail, senderName } = cfg;
  if (!apiKey) {
    return {
      ok: false,
      error: 'Brevo API key is not configured. Set it in Admin → Settings (key "brevo") or via BREVO_API_KEY.',
    };
  }
  let res: Response;
  try {
    /* Deliverability: always ship a text/plain part alongside the HTML
       (HTML-only mail scores as spam), set a real reply-to, and a
       List-Unsubscribe header — Gmail weighs all three. */
    const textContent = html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2: $1 ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        replyTo: { email: senderEmail.replace(/^noreply@/, 'support@'), name: senderName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent,
        headers: { 'List-Unsubscribe': `<mailto:${senderEmail.replace(/^noreply@/, 'support@')}>` },
      }),
    });
  } catch (e) {
    return { ok: false, error: `Could not reach Brevo: ${(e as Error)?.message}` };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Brevo's common failures, made human-readable:
    //   401 unauthorized      → bad/missing BREVO_API_KEY
    //   400 + sender error    → BREVO_SENDER_EMAIL not verified in Brevo
    const code = body?.code || '';
    let hint = body?.message || `Brevo error ${res.status}`;
    if (res.status === 401)
      hint = `Brevo 401: ${body?.message || 'unauthorized'}. Zkontrolujte: (1) jde o API v3 klíč (xkeysib-…), ne SMTP klíč, (2) povolené IP adresy na https://app.brevo.com/security/authorised_ips, (3) klíč v Admin → Settings (key "brevo") nebo BREVO_API_KEY.`;
    else if (/sender/i.test(hint) || code === 'invalid_parameter')
      hint = `Brevo rejected the sender "${senderEmail}" — verify it in Brevo → Senders. (${hint})`;
    return { ok: false, error: hint };
  }
  return { ok: true };
}

/* admin.listUsers() returns ONE page (50 by default) — on projects with
   more users a fresh signup is never on page one and email lookups
   silently miss. Walk pages at 1000/user chunks until found. */
async function findAuthUserByEmail(supabase: any, email: string): Promise<any | null> {
  const needle = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const users = data?.users || [];
    const match = users.find((u: any) => (u.email || '').toLowerCase() === needle);
    if (match) return match;
    if (users.length < 1000) return null; // last page reached
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured.' });
  const supabase = createClient(supabaseUrl, serviceKey);
  const brevoCfg = await resolveBrevoConfig(supabase);

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  /* CSRF-style origin check for browser-driven POSTs. */
  if (!originAllowed(req)) {
    return json(403, { error: 'Zdroj požadavku není povolen.', code: 'ORIGIN_BLOCKED' });
  }

  /* Rate-limit every action per caller IP before doing any work. */
  const limit = LIMITS[action];
  if (limit) {
    const t = await throttle(supabase, `ip:${clientIp(req)}`, `account-email:${action}`, limit.max, limit.windowSec);
    if (t.limited) return tooManyRequests(t.retryAfter);
  }

  try {
    if (action === 'signup') {
      /* Full server-side signup. We create the auth user via the ADMIN API
         with email_confirm:false — unlike client-side auth.signUp() this
         sends NO Supabase email, so the only mail the user receives is our
         branded Brevo confirmation below. GoTrue blocks password sign-in
         until email_confirmed_at is set (our `confirm` action sets it). */
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email.' });
      if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters.' });

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { display_name: displayName },
      });
      if (createErr) {
        if (/already|registered|exists/i.test(createErr.message || '')) {
          return json(409, { error: 'Účet s tímto e-mailem už existuje — přihlaste se, nebo použijte „Zapomenuté heslo".' });
        }
        return json(500, { error: createErr.message });
      }

      const token = randomToken();
      const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const { error: tokErr } = await supabase.from('email_tokens').insert({
        email,
        auth_user_id: created.user?.id || null,
        kind: 'confirm',
        token,
        expires_at: expires,
      });
      if (tokErr) return json(500, { error: tokErr.message });

      const url = `${APP_ORIGIN}/auth/confirm?token=${token}`;
      const html = emailShell({
        heading: 'Potvrďte svůj e-mail',
        body: `Vítejte na Skinify${displayName ? `, ${displayName}` : ''}! Potvrďte prosím svou e-mailovou adresu a aktivujte účet.`,
        ctaLabel: 'Potvrdit e-mail',
        ctaUrl: url,
        footnote: 'Odkaz vyprší za 24 hodin. Pokud jste si účet na Skinify nezakládali, tento e-mail ignorujte.',
      });
      const sent = await sendViaBrevo(brevoCfg, email, 'Potvrďte svůj e-mail na Skinify', html);
      /* The account exists either way; a failed send is surfaced so the
         waiting screen's "resend" button can retry with a clear error. */
      return json(200, { ok: true, needsConfirm: true, emailSent: sent.ok, emailError: sent.ok ? undefined : sent.error });
    }

    if (action === 'send_confirmation') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email.' });
      const token = randomToken();
      const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const { error } = await supabase.from('email_tokens').insert({
        email,
        auth_user_id: body.authUserId || null,
        kind: 'confirm',
        token,
        expires_at: expires,
      });
      if (error) return json(500, { error: error.message });

      const url = `${APP_ORIGIN}/auth/confirm?token=${token}`;
      const html = emailShell({
        heading: 'Confirm your email',
        body: `Welcome to Skinify${body.displayName ? `, ${body.displayName}` : ''}! Please confirm your email address to activate your account.`,
        ctaLabel: 'Confirm email',
        ctaUrl: url,
        footnote: 'This link expires in 24 hours. If you didn’t create a Skinify account, you can ignore this email.',
      });
      const sent = await sendViaBrevo(brevoCfg, email, 'Confirm your Skinify email', html);
      if (!sent.ok) return json(502, { error: sent.error });
      return json(200, { ok: true });
    }

    if (action === 'confirm') {
      const token = String(body.token || '');
      const { data: row } = await supabase
        .from('email_tokens')
        .select('*')
        .eq('token', token)
        .eq('kind', 'confirm')
        .maybeSingle();
      if (!row) return json(400, { error: 'Invalid or unknown token.' });
      if (row.used_at) return json(400, { error: 'This link has already been used.' });
      if (new Date(row.expires_at).getTime() < Date.now()) return json(400, { error: 'This link has expired.' });

      // Resolve the auth user by id or email and mark confirmed.
      let authUserId = row.auth_user_id as string | null;
      if (!authUserId) {
        authUserId = (await findAuthUserByEmail(supabase, row.email))?.id || null;
      }
      if (!authUserId) {
        return json(500, { error: 'Účet pro tento odkaz nebyl nalezen. Zkuste e-mail poslat znovu.' });
      }
      /* Fail LOUDLY — the old code ignored this error, so the page could
         show "confirmed" while the account stayed unverified and the
         waiting tab polled forever. */
      const { error: upErr } = await supabase.auth.admin.updateUserById(authUserId, { email_confirm: true });
      if (upErr) return json(500, { error: `Potvrzení selhalo: ${upErr.message}` });
      /* Verify it actually took. */
      const { data: after } = await supabase.auth.admin.getUserById(authUserId);
      if (!after?.user?.email_confirmed_at) {
        return json(500, { error: 'Potvrzení se nepropsalo — zkuste odkaz otevřít znovu.' });
      }
      await supabase.from('email_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);
      return json(200, { ok: true });
    }

    if (action === 'check_confirmed') {
      /* Polled by the post-signup "waiting for verification" screen so the
         original tab can auto-continue the moment the email link is
         clicked. Returns confirmed:false for unknown emails (no account
         enumeration beyond what signup already reveals). */
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email.' });
      const match = await findAuthUserByEmail(supabase, email);
      return json(200, { confirmed: !!match?.email_confirmed_at });
    }

    if (action === 'send_reset') {
      const email = String(body.email || '').trim().toLowerCase();
      /* Uniform response + uniform timing regardless of account existence.
         The lookup + Brevo send only happen for real accounts, but we pad
         to a fixed floor so an attacker can't distinguish "exists" from
         "doesn't" by response time (the listUsers scan is slower than a
         no-op). Always return the same 200 body. */
      const started = Date.now();
      const MIN_MS = 700;
      const finish = async () => {
        const elapsed = Date.now() - started;
        if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
        return json(200, { ok: true });
      };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return finish();
      const match = await findAuthUserByEmail(supabase, email);
      if (match) {
        const token = randomToken();
        const expires = new Date(Date.now() + 3600 * 1000).toISOString();
        await supabase.from('email_tokens').insert({
          email,
          auth_user_id: match.id,
          kind: 'reset',
          token,
          expires_at: expires,
        });
        const url = `${APP_ORIGIN}/auth/reset?token=${token}`;
        const html = emailShell({
          heading: 'Reset your password',
          body: 'We received a request to reset your Skinify password. Click below to choose a new one.',
          ctaLabel: 'Reset password',
          ctaUrl: url,
          footnote: 'This link expires in 1 hour. If you didn’t request this, you can safely ignore this email — your password stays the same.',
        });
        await sendViaBrevo(brevoCfg, email, 'Reset your Skinify password', html);
      }
      return finish();
    }

    if (action === 'reset') {
      const token = String(body.token || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 8) return json(400, { error: 'Password must be at least 8 characters.' });
      const { data: row } = await supabase
        .from('email_tokens')
        .select('*')
        .eq('token', token)
        .eq('kind', 'reset')
        .maybeSingle();
      if (!row) return json(400, { error: 'Invalid or unknown token.' });
      if (row.used_at) return json(400, { error: 'This link has already been used.' });
      if (new Date(row.expires_at).getTime() < Date.now()) return json(400, { error: 'This link has expired.' });
      if (!row.auth_user_id) return json(400, { error: 'No account for this token.' });

      const { error: upErr } = await supabase.auth.admin.updateUserById(row.auth_user_id, {
        password: newPassword,
      });
      if (upErr) return json(500, { error: upErr.message });
      await supabase.from('email_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);
      return json(200, { ok: true });
    }

    return json(400, { error: `Unknown action "${action}".` });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'Unexpected error.' });
  }
});
