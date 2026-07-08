-- Bonus claim tracking so the Bonuses page is real, not mocked.
--
-- Each row records a user claiming a specific bonus. For cooldown-based
-- bonuses (daily/weekly/monthly) the claimed_at drives when the next
-- claim is allowed. For one-time bonuses (streak/social milestones) the
-- presence of a row means "completed → no longer eligible".
--
-- Progress itself is computed live by the `bonuses` edge function from
-- existing tables (orders, user_transactions, login activity), so we only
-- persist the claim events here.

CREATE TABLE IF NOT EXISTS user_bonus_claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  steam_id     text NOT NULL,
  bonus_id     text NOT NULL,
  reward_kind  text,                -- 'credit' | 'percent' | 'crate'
  reward_value numeric DEFAULT 0,   -- CZK credited (for 'credit' rewards)
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bonus_claims_steam ON user_bonus_claims (steam_id);
CREATE INDEX IF NOT EXISTS idx_bonus_claims_bonus ON user_bonus_claims (steam_id, bonus_id, claimed_at DESC);

-- Service-role only (the bonuses edge function). No anon access.
ALTER TABLE user_bonus_claims ENABLE ROW LEVEL SECURITY;
