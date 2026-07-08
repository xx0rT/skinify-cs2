-- Two-factor authentication (TOTP / Google Authenticator) for accounts.
--
-- Steam-OpenID users hold no Supabase Auth session, so we can't use
-- Supabase Auth's built-in MFA. Instead the `two-factor` edge function
-- (service_role) stores the TOTP secret + backup codes on the users row,
-- keyed by steam_id, and verifies 6-digit codes server-side.
--
--   totp_secret        base32 shared secret (pending until enabled)
--   totp_enabled       true once the user has verified a code
--   totp_backup_codes  jsonb array of single-use recovery codes
--   totp_enabled_at    timestamp of activation (audit)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS totp_enabled_at timestamptz;
