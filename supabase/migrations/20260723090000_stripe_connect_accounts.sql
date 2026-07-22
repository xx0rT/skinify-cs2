/*
  # stripe_connect_accounts — one row per user's Stripe Connect account

  Part of the Stripe Connect migration: sellers get their own Stripe
  connected account (v2 Accounts API, recipient configuration) so their
  cut of a sale can be paid out as a real Stripe Transfer + Payout
  instead of living as a plain number in users.pending_balance/
  current_balance forever, waiting on a manual admin-triggered payout.

  Onboarding is opt-in and lazy: a row only exists once a user has
  clicked "Set up payouts" (first withdrawal attempt) — most users will
  never have a row here, and that's fine; they keep using the existing
  current_balance / withdraw_requests flow untouched.

  Column notes:
    - stripe_account_id: the Stripe v2 Account id (acct_... or the v2
      equivalent — kept as opaque text since the API is still evolving).
    - onboarding_status: not_started is never actually persisted (no row
      = not_started); real values are pending → complete, or restricted
      if Stripe later flags the account (e.g. more info requested).
    - payouts_enabled / details_submitted: mirrors Stripe's own account
      flags, kept denormalized so the app doesn't need a live Stripe
      call on every settings-page render. Refreshed by the
      stripe-connect edge function (on return from onboarding) and by
      stripe-connect-webhook (on account.updated).

  RLS: user can SELECT their own row only (to render onboarding status
  in Settings). All writes go through the stripe-connect edge function
  (service role bypasses RLS) — never trust the client to self-report
  "payouts_enabled".
*/

CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_steam_id text NOT NULL,
  stripe_account_id text UNIQUE NOT NULL,
  onboarding_status text NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'complete', 'restricted')),
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  country text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_steam
  ON stripe_connect_accounts (user_steam_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_stripe_id
  ON stripe_connect_accounts (stripe_account_id);

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users read their own Connect account"
  ON stripe_connect_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = stripe_connect_accounts.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

/* No INSERT/UPDATE policy for `authenticated` — every write is done by
   the stripe-connect / stripe-connect-webhook edge functions via the
   service role, which bypasses RLS entirely. A user faking their own
   payouts_enabled=true via a direct REST call must not be possible. */

GRANT SELECT ON stripe_connect_accounts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE stripe_connect_accounts_id_seq TO authenticated;
