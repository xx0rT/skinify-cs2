/*
  # P2P escrow automation — schedule everything via pg_cron

  This migration turns the existing escrow edge functions into a
  fully-automated P2P pipeline by wiring them up on a schedule:

    - auto-escrow-release        every 5 min   (auto-release after 8 days)
    - verify-steam-inventory     every 60 sec  (poll pending orders)
    - auto-refund-unfulfilled    every 5 min   (refund stuck orders > 60 min)

  We use pg_cron + pg_net to call edge functions from the database, which
  is the canonical Supabase pattern. The functions themselves stay the
  same; this layer just schedules them.

  Also adds:
    - orders.auto_refunded                — soft flag so the cron can
                                            skip rows it already refunded
    - orders.last_inventory_check_at      — throttle inventory polls
    - orders.inventory_check_attempts     — escalate to support after N
    - orders.refund_eligible_at           — wall-clock cutoff (now()+60m)
                                            for the auto-refund cron;
                                            stored explicitly so we
                                            don't have to do interval
                                            math in the cron query
                                            (cron expressions are
                                            simpler with timestamp
                                            comparisons).

  An atomic SECURITY DEFINER function `process_order_payment` is added
  too: it locks the buyer row with FOR UPDATE, deducts the balance, and
  inserts the user_transactions row in one transaction. Replaces the
  hand-rolled "UPDATE users SET current_balance + INSERT user_transactions"
  pair that was racy and triggered the double-deduction bug.
*/

-- ─── Extensions ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Orders columns ──────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS auto_refunded boolean DEFAULT false;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS last_inventory_check_at timestamptz;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS inventory_check_attempts int DEFAULT 0;

/* Refund cutoff: 60 minutes after the order is created the cron is
   allowed to auto-refund if trade_verified is still false. We default
   it via a trigger so legacy rows don't get NULL'd out. */
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_eligible_at timestamptz;

CREATE OR REPLACE FUNCTION set_refund_eligible_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.refund_eligible_at IS NULL THEN
    /* 60-minute window. Adjust here in one place if policy changes. */
    NEW.refund_eligible_at := COALESCE(NEW.created_at, now()) + interval '60 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_refund_eligible_at ON orders;
CREATE TRIGGER trigger_set_refund_eligible_at
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_refund_eligible_at();

/* Backfill: any existing pending order without a refund_eligible_at
   gets one set 60 min after its created_at. Idempotent. */
UPDATE orders
SET refund_eligible_at = created_at + interval '60 minutes'
WHERE refund_eligible_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_refund_cron
  ON orders (refund_eligible_at)
  WHERE auto_refunded = false
    AND trade_verified = false
    AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_inventory_poll
  ON orders (last_inventory_check_at NULLS FIRST)
  WHERE trade_verified = false
    AND status = 'pending'
    AND auto_refunded = false;

-- ─── Atomic order-payment function ───────────────────────────────────
/*
  process_order_payment(buyer_id uuid, amount numeric, description text,
                        metadata jsonb)

  Locks the buyer's users row with FOR UPDATE, verifies the balance,
  inserts the purchase user_transaction (which fires the existing
  update_user_balance trigger to deduct current_balance + bump
  total_spent), and returns the new balance.

  Returns NULL if the buyer doesn't exist or has insufficient balance —
  callers should check for NULL and surface the right error to the
  client. We don't raise EXCEPTION on insufficient-balance because we
  want a clean 4xx response, not a generic 500.
*/
CREATE OR REPLACE FUNCTION process_order_payment(
  p_buyer_id uuid,
  p_buyer_steam_id text,
  p_amount numeric,
  p_description text,
  p_metadata jsonb
)
RETURNS TABLE (
  ok boolean,
  reason text,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT false, 'invalid_amount', NULL::numeric;
    RETURN;
  END IF;

  /* Row-level lock prevents two concurrent orders from each seeing
     the same starting balance. The lock is released when the
     enclosing transaction commits/rolls back. */
  SELECT current_balance INTO v_current_balance
  FROM users
  WHERE id = p_buyer_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 'buyer_not_found', NULL::numeric;
    RETURN;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, 'insufficient_balance', v_current_balance;
    RETURN;
  END IF;

  /* Insert the transaction. The BEFORE INSERT trigger
     `update_user_balance` does the actual balance UPDATE; we don't
     do it manually any more (was the source of the double-deduct bug).
     The trigger also updates total_spent atomically. */
  INSERT INTO user_transactions (
    user_id, steam_id, type, amount, description,
    reference_id, status, completed_at, metadata
  ) VALUES (
    p_buyer_id, p_buyer_steam_id, 'purchase', p_amount, p_description,
    'purchase_' || extract(epoch from now())::bigint, 'completed', now(),
    p_metadata
  );

  /* Re-read the balance after the trigger fired. */
  SELECT current_balance INTO v_current_balance
  FROM users
  WHERE id = p_buyer_id;

  RETURN QUERY SELECT true, NULL::text, v_current_balance;
END;
$$;

/* Allow the service-role (used by edge functions) to call it. The
   function is SECURITY DEFINER so it bypasses RLS internally; callers
   only need EXECUTE. */
GRANT EXECUTE ON FUNCTION process_order_payment(uuid, text, numeric, text, jsonb)
  TO service_role, authenticated;

-- ─── Helper: schedule an edge function call ──────────────────────────
/*
  call_edge_function(slug text, body jsonb)
    Wraps pg_net.http_post with the project's anon key + service-role
    auth header so cron jobs don't have to know about secrets.

    Reads the URL + service role key from app_settings (a small KV
    table we ship below). This indirection means an ops change (key
    rotation, project move) is a single UPDATE instead of a migration.
*/
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
/* No SELECT/INSERT/UPDATE policies — service role only. */

/* IMPORTANT: ops must populate these once after deploy:

     INSERT INTO app_settings (key, value) VALUES
       ('supabase_url',           '<project URL>'),
       ('supabase_service_role',  '<service role key>')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

   Until those rows exist the cron jobs are no-ops (the helper returns
   early). That's intentional — running without the secret would
   silently send unauthenticated requests. */
CREATE OR REPLACE FUNCTION call_edge_function(slug text, body jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
BEGIN
  SELECT value INTO v_url FROM app_settings WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM app_settings WHERE key = 'supabase_service_role';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE 'call_edge_function: missing app_settings (supabase_url / service_role)';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url || '/functions/v1/' || slug,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := body
  ) INTO v_request_id;
  RETURN v_request_id;
END;
$$;

-- ─── Cron picker RPCs ────────────────────────────────────────────────
/*
  Atomically pick one pending order to verify against Steam.

  Uses FOR UPDATE SKIP LOCKED so concurrent cron invocations can't
  grab the same row. Bumps inventory_check_attempts and stamps
  last_inventory_check_at in the same statement so the next tick
  honours the throttle even if this run never returns a verdict
  (network drop, Steam 5xx).
*/
CREATE OR REPLACE FUNCTION pick_inventory_check_candidate()
RETURNS TABLE (
  transaction_id text,
  buyer_steam_id text,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_picked_id bigint;
BEGIN
  SELECT id INTO v_picked_id
  FROM orders
  WHERE status = 'pending'
    AND payment_status = 'completed'
    AND trade_verified = false
    AND auto_refunded = false
    AND inventory_check_attempts < 30
    AND (last_inventory_check_at IS NULL OR last_inventory_check_at < now() - interval '2 minutes')
  ORDER BY last_inventory_check_at NULLS FIRST, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_picked_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE orders
  SET inventory_check_attempts = inventory_check_attempts + 1,
      last_inventory_check_at = now()
  WHERE id = v_picked_id;

  RETURN QUERY
    SELECT o.transaction_id, o.buyer_steam_id, o.items
    FROM orders o
    WHERE o.id = v_picked_id;
END;
$$;

GRANT EXECUTE ON FUNCTION pick_inventory_check_candidate() TO service_role;

/*
  Atomically pick one stale unfulfilled order to refund.
  Same SKIP LOCKED pattern as above; flips auto_refunded=true and
  status='refunded' in one statement so the cron is self-throttling.
*/
CREATE OR REPLACE FUNCTION pick_refund_candidate()
RETURNS TABLE (
  transaction_id text,
  buyer_steam_id text,
  total_amount numeric,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_picked_id bigint;
BEGIN
  SELECT id INTO v_picked_id
  FROM orders
  WHERE status = 'pending'
    AND auto_refunded = false
    AND trade_verified = false
    AND refund_eligible_at IS NOT NULL
    AND refund_eligible_at < now()
  ORDER BY refund_eligible_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_picked_id IS NULL THEN
    RETURN;
  END IF;

  /* Mark it so a second cron tick (or the manual-confirm path) can't
     also refund the same order. The actual balance credit is done by
     the edge function so it can also insert a user_transaction row
     for audit. */
  UPDATE orders
  SET auto_refunded = true,
      status = 'refunded',
      tracking_notes = COALESCE(tracking_notes, '') ||
        E'\nAuto-refunded at ' || now()::text ||
        ' (seller did not deliver in time).'
  WHERE id = v_picked_id;

  RETURN QUERY
    SELECT o.transaction_id, o.buyer_steam_id, o.total_amount, o.items
    FROM orders o
    WHERE o.id = v_picked_id;
END;
$$;

GRANT EXECUTE ON FUNCTION pick_refund_candidate() TO service_role;

-- ─── Schedule the cron jobs ──────────────────────────────────────────
/*
  Unschedule existing jobs by name (idempotent — first run is a no-op).
  Then schedule with the desired cadences.
*/

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  /* unschedule by name, ignore "not found" errors */
  FOR v_job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'skinify_auto_escrow_release',
      'skinify_verify_inventory',
      'skinify_auto_refund_unfulfilled'
    )
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END $$;

/* Auto-escrow release — every 5 minutes. The function itself filters
   to orders past the 8-day window so this is cheap to call frequently. */
SELECT cron.schedule(
  'skinify_auto_escrow_release',
  '*/5 * * * *',
  $$ SELECT call_edge_function('auto-escrow-release', '{}'::jsonb); $$
);

/* Inventory verification poll — every 60 seconds. The edge function
   we add below picks the oldest unverified pending order, hits Steam,
   and either marks it verified or bumps the retry counter. Picking
   one order per tick keeps Steam rate-limited calls in check. */
SELECT cron.schedule(
  'skinify_verify_inventory',
  '* * * * *',
  $$ SELECT call_edge_function('verify-steam-inventory', '{"mode":"cron"}'::jsonb); $$
);

/* Auto-refund unfulfilled — every 5 minutes. The new
   auto-refund-unfulfilled function processes orders where
   refund_eligible_at < now() AND trade_verified=false. */
SELECT cron.schedule(
  'skinify_auto_refund_unfulfilled',
  '*/5 * * * *',
  $$ SELECT call_edge_function('auto-refund-unfulfilled', '{}'::jsonb); $$
);
