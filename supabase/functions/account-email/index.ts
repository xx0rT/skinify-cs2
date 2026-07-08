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

async function sendViaBrevo(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY is not configured' };
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@skinify.gg';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Skinify';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body?.message || `Brevo failed (${res.status})` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Server misconfigured.' });
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  try {
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
      const sent = await sendViaBrevo(email, 'Confirm your Skinify email', html);
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
        const { data: listed } = await supabase.auth.admin.listUsers();
        authUserId = listed?.users?.find((u: any) => u.email === row.email)?.id || null;
      }
      if (authUserId) {
        await supabase.auth.admin.updateUserById(authUserId, { email_confirm: true });
      }
      await supabase.from('email_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);
      return json(200, { ok: true });
    }

    if (action === 'send_reset') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email.' });
      // Don't leak whether the account exists — always return ok, but only
      // send if there's a matching auth user.
      const { data: listed } = await supabase.auth.admin.listUsers();
      const match = listed?.users?.find((u: any) => u.email === email);
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
        await sendViaBrevo(email, 'Reset your Skinify password', html);
      }
      return json(200, { ok: true });
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
