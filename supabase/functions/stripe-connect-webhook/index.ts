/*
  stripe-connect-webhook — keeps stripe_connect_accounts in sync with
  Stripe without relying on the user always completing the return_url
  redirect after hosted onboarding (they might close the tab, lose
  connection, etc.).

  Listens for `account.updated` events (Connect events, sent to whatever
  webhook endpoint URL you register for the "Connect" event destination
  in the Stripe Dashboard — separate from the main account's webhook
  used by `stripe-payment`). On each event, re-derives payouts_enabled/
  details_submitted/onboarding_status from the event payload the same
  way `stripe-connect`'s refresh_status action does, so the two stay
  logically identical.

  Signature verification: Stripe signs webhook bodies with HMAC-SHA256
  over `${timestamp}.${rawBody}`, using the endpoint's signing secret.
  Verified by hand (no Stripe SDK anywhere in this Deno codebase) using
  the Web Crypto API — same approach needed because Deno edge functions
  don't have Node's `crypto.createHmac` available via a stable import
  for this constant-time-safe use case.
*/
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Parses Stripe's `Stripe-Signature` header:
   "t=1614556800,v1=abc123...,v0=..." — we only need t + v1. */
function parseSigHeader(header: string): { timestamp: string; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v];
    }),
  );
  if (!parts.t || !parts.v1) return null;
  return { timestamp: parts.t, v1: parts.v1 };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[stripe-connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET not configured');
    return json({ error: 'Webhook not configured' }, 500);
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) {
    return json({ error: 'Missing Stripe-Signature header' }, 400);
  }
  const parsed = parseSigHeader(sigHeader);
  if (!parsed) {
    return json({ error: 'Malformed Stripe-Signature header' }, 400);
  }

  /* Reject if the timestamp is more than 5 minutes old — standard
     Stripe replay-attack mitigation. */
  const age = Math.abs(Date.now() / 1000 - Number(parsed.timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return json({ error: 'Webhook timestamp too old' }, 400);
  }

  const expectedSig = await hmacSha256Hex(webhookSecret, `${parsed.timestamp}.${rawBody}`);
  if (expectedSig !== parsed.v1) {
    console.error('[stripe-connect-webhook] signature mismatch — rejecting');
    return json({ error: 'Invalid signature' }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (event.type !== 'account.updated') {
    /* Not an error — we just don't care about other Connect event
       types (capability.updated, person.updated, etc.) right now. */
    return json({ received: true, ignored: event.type });
  }

  const account = event.data?.object;
  if (!account?.id) {
    return json({ error: 'Malformed account.updated payload' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  /* Same derivation logic as stripe-connect's refresh_status action —
     keep these two in sync if Stripe's response shape changes. */
  const recipientConfig = account?.configuration?.recipient;
  const payoutsEnabled =
    recipientConfig?.capabilities?.stripe_balance?.payouts?.status === 'active';
  const currentlyDue = account?.requirements?.currently_due?.length ?? 0;
  const detailsSubmitted = currentlyDue === 0;
  const onboardingStatus = payoutsEnabled
    ? 'complete'
    : currentlyDue > 0 && detailsSubmitted
    ? 'restricted'
    : 'pending';

  const { error: updateErr } = await supabase
    .from('stripe_connect_accounts')
    .update({
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
      onboarding_status: onboardingStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  if (updateErr) {
    /* Log but still 200 — Stripe retries on non-2xx, and retrying a
       row-not-found (e.g. a stale/test account) forever isn't useful. */
    console.error('[stripe-connect-webhook] failed to update row:', updateErr.message);
  } else {
    console.log(`[stripe-connect-webhook] ${account.id} -> ${onboardingStatus} (payouts_enabled=${payoutsEnabled})`);
  }

  return json({ received: true });
});
