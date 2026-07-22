/*
  # Extend the existing promo_codes system for deposit bonuses

  `promo_codes` / `promo_code_uses` / `apply_promo_code()` already exist
  (20251009130000) but were built for order-total discounts and were
  never wired into any UI. This migration adds what the DepositModal's
  new promo-code field needs without duplicating the table:

    - `min_deposit_czk`, `first_deposit_only` on promo_codes — deposit-
      specific eligibility the original order-discount design didn't need.
    - `payment_intent_id`, `bonus_amount_czk` on promo_code_uses — so a
      redemption can be tied to the Stripe payment that earned it.
    - A unique (promo_code_id, user_id) constraint so "one redemption
      per user" is enforced by the DB, not just application logic.
    - Seeds the WELCOME10 code the DepositModal already advertises in
      its UI copy, so it actually exists to be typed in.

  Referral-code redemption (typing a friend's personal code) is handled
  by the promo-code edge function directly against `users.referral_code`
  + `referrals` — no separate table needed for that path.
*/

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS min_deposit_czk numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_deposit_only boolean NOT NULL DEFAULT false;

ALTER TABLE promo_code_uses
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS bonus_amount_czk numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_code_uses_promo_user_unique'
  ) THEN
    ALTER TABLE promo_code_uses
      ADD CONSTRAINT promo_code_uses_promo_user_unique UNIQUE (promo_code_id, user_id);
  END IF;
END $$;

-- Seed the welcome code the DepositModal UI already describes
-- ("+10% bonus on your first deposit"), which previously existed only
-- as hardcoded client copy with no backing row to redeem.
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_until, min_deposit_czk, first_deposit_only)
VALUES ('WELCOME10', 'percentage', 10, 1000000, now() + interval '10 years', 50, true)
ON CONFLICT (code) DO NOTHING;

-- Redeeming a friend's referral code at deposit time upserts a row here
-- (promo-code edge function) — needs a unique pair so the upsert is
-- idempotent instead of creating a duplicate relationship on a second
-- deposit with the same code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referrer_referred_unique'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referrer_referred_unique UNIQUE (referrer_id, referred_id);
  END IF;
END $$;
