import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * send-email — transactional email relay backed by Brevo.
 *
 * POST { to, subject, html, replyTo? }
 *
 * Secrets (set via `supabase secrets set`):
 *   BREVO_API_KEY      — Brevo v3 API key (required)
 *   BREVO_SENDER_EMAIL — verified sender address (default noreply@skinify.gg)
 *   BREVO_SENDER_NAME  — sender display name (default Skinify)
 *
 * Kept deliberately minimal: the client builds the HTML, this function
 * only relays it so the API key never ships to the browser.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    /* Key resolution: system_settings row "brevo" (settable from Admin →
       Settings, no CLI needed) takes precedence over the env secret. */
    let apiKey = '';
    let dbSender = '';
    let dbSenderName = '';
    try {
      const su = Deno.env.get('SUPABASE_URL');
      const sk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (su && sk) {
        const sb = createClient(su, sk);
        const { data } = await sb.from('system_settings').select('value').eq('key', 'brevo').maybeSingle();
        const v = (data?.value || {}) as any;
        if (typeof v.api_key === 'string') apiKey = v.api_key.trim();
        if (typeof v.sender_email === 'string') dbSender = v.sender_email.trim();
        if (typeof v.sender_name === 'string') dbSenderName = v.sender_name.trim();
      }
    } catch { /* fall back to env */ }
    if (!apiKey) apiKey = (Deno.env.get('BREVO_API_KEY') || '').trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Brevo API key is not configured (Admin → Settings key "brevo", or BREVO_API_KEY).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { to, subject, html, replyTo } = await req.json();

    if (
      typeof to !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
      typeof subject !== 'string' ||
      subject.length === 0 ||
      subject.length > 200 ||
      typeof html !== 'string' ||
      html.length === 0 ||
      html.length > 100_000
    ) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const senderEmail = dbSender || Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@skinify.gg';
    const senderName = dbSenderName || Deno.env.get('BREVO_SENDER_NAME') || 'Skinify';

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(typeof replyTo === 'string' && replyTo.includes('@')
          ? { replyTo: { email: replyTo } }
          : {}),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[send-email] Brevo rejected:', res.status, body);
      return new Response(
        JSON.stringify({ error: body?.message || 'Brevo request failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true, messageId: body?.messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-email] error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
