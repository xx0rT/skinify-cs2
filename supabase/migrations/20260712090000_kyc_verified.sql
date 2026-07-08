-- KYC (identity verification) status, set by the sumsub-kyc edge function
-- when Sumsub returns a GREEN review. The buy-gate requires this before an
-- email/credentials user can purchase.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;
