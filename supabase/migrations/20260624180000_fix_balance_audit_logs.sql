/*
  # Fix order-creation 500: missing balance_audit_logs table

  Root cause: the `log_balance_change` trigger (created in
  20251003120000_fix_security_policies.sql) fires AFTER UPDATE on
  users and inserts a row into balance_audit_logs. That target table
  was never created in any prior migration, so every UPDATE on
  users.current_balance fails with `relation "balance_audit_logs"
  does not exist` — which surfaces in the orders edge function as
  "Failed to process order payment" / Checkout failed.

  This migration:
    1. Creates balance_audit_logs with the exact column shape the
       trigger writes (user_id, user_steam_id, old_balance, new_balance,
       balance_change, change_type, triggered_by, metadata, created_at).
    2. Replaces the trigger body so any future audit-log failure
       is caught (`EXCEPTION WHEN OTHERS`) and logged via RAISE NOTICE
       instead of rolling back the user UPDATE — security auditing is
       nice to have but it must NEVER block legitimate balance
       movement, especially in the checkout path.
    3. Adds the obvious indexes (by user_id, by created_at) so audit
       queries don't get expensive.

  RLS: enabled with a single SELECT policy that lets users read their
  own audit rows. Service role bypasses RLS so the trigger insert
  always succeeds.
*/

CREATE TABLE IF NOT EXISTS balance_audit_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_steam_id text,
  old_balance numeric NOT NULL DEFAULT 0,
  new_balance numeric NOT NULL DEFAULT 0,
  balance_change numeric NOT NULL DEFAULT 0,
  change_type text NOT NULL CHECK (change_type IN ('credit', 'debit')),
  /* Postgres `current_user` is a name token. Stored as text so the
     trigger can write it directly without casting. */
  triggered_by text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_balance_audit_logs_user_id
  ON balance_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_audit_logs_steam_id
  ON balance_audit_logs (user_steam_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_audit_logs_created_at
  ON balance_audit_logs (created_at DESC);

ALTER TABLE balance_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own audit rows" ON balance_audit_logs;
CREATE POLICY "Users can read their own audit rows"
  ON balance_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = balance_audit_logs.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

/* Replace the trigger body. Same audit-write semantics, but wrapped
   in a BEGIN…EXCEPTION block so the outer UPDATE on users can never
   be rolled back by an audit-log failure. */
CREATE OR REPLACE FUNCTION log_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.current_balance IS DISTINCT FROM NEW.current_balance) THEN
    BEGIN
      INSERT INTO balance_audit_logs (
        user_id,
        user_steam_id,
        old_balance,
        new_balance,
        balance_change,
        change_type,
        triggered_by,
        metadata
      ) VALUES (
        NEW.id,
        NEW.steam_id,
        COALESCE(OLD.current_balance, 0),
        COALESCE(NEW.current_balance, 0),
        COALESCE(NEW.current_balance, 0) - COALESCE(OLD.current_balance, 0),
        CASE
          WHEN (COALESCE(NEW.current_balance, 0) - COALESCE(OLD.current_balance, 0)) > 0
            THEN 'credit'
          ELSE 'debit'
        END,
        current_user,
        jsonb_build_object(
          'old_balance', OLD.current_balance,
          'new_balance', NEW.current_balance,
          'timestamp', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      /* Auditing is a soft requirement — log + continue so the
         user UPDATE always commits. Without this, ANY problem in
         the audit-log path (missing table, schema drift, RLS
         misconfig) would kill the entire checkout flow. */
      RAISE NOTICE 'log_balance_change: audit insert failed (%): %', SQLSTATE, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

/* Recreate the trigger so the new function body is bound. */
DROP TRIGGER IF EXISTS trigger_log_balance_change ON users;
CREATE TRIGGER trigger_log_balance_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_balance_change();
