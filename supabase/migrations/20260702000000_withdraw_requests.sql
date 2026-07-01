/*
  # withdraw_requests — admin-reviewed withdrawal queue

  Users submit a withdrawal request; funds are moved into a pending
  hold on their balance so they can't double-spend. An admin then
  reviews via the admin panel and either approves (money is released
  from hold and a real payout is triggered externally) or rejects
  (money returns to the user's spendable balance).

  Column notes:
    - status transitions: pending → approved | rejected
    - method: 'bank_transfer' | 'card' | 'paypal' | 'crypto'
    - payout_details: jsonb holding whatever the method needs
      (IBAN + name for bank, wallet address for crypto, etc.). We
      keep it jsonb so new methods don't require a schema change.
    - reviewed_by / reviewed_at: stamped when the admin acts.
    - reason: mandatory when status='rejected', optional otherwise.

  RLS: user can SELECT / INSERT their own rows only. Admins are handled
  server-side via the review edge function (service role bypasses RLS).
*/

CREATE TABLE IF NOT EXISTS withdraw_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_steam_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  fee numeric NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount numeric NOT NULL CHECK (net_amount >= 0),
  currency text NOT NULL DEFAULT 'CZK',
  method text NOT NULL CHECK (method IN ('bank_transfer', 'card', 'paypal', 'crypto')),
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  reason text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status
  ON withdraw_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user
  ON withdraw_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_steam
  ON withdraw_requests (user_steam_id, created_at DESC);

ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;

/* Users see + create their own withdraw requests. Admin uses the
   service role via the review edge function to bypass RLS. */
DROP POLICY IF EXISTS "Users read their own withdraw requests" ON withdraw_requests;
CREATE POLICY "Users read their own withdraw requests"
  ON withdraw_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = withdraw_requests.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create their own withdraw requests" ON withdraw_requests;
CREATE POLICY "Users create their own withdraw requests"
  ON withdraw_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = withdraw_requests.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

/* Grant explicit table permissions so the REST gateway doesn't 401
   the calls before RLS even runs. */
GRANT SELECT, INSERT ON withdraw_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE withdraw_requests_id_seq TO authenticated;
