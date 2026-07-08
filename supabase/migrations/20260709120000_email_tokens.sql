-- Custom email confirmation + password-reset tokens, so these emails go
-- out through Brevo (our transactional sender) rather than Supabase's
-- built-in SMTP. The account-email edge function issues and verifies them.
--
--   kind    'confirm' | 'reset'
--   token   random url-safe string emailed to the user
--   expires short-lived (confirm 24h, reset 1h)
--   used_at set once redeemed (single-use)

CREATE TABLE IF NOT EXISTS email_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  auth_user_id uuid,
  kind        text NOT NULL CHECK (kind IN ('confirm', 'reset')),
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens (token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_email ON email_tokens (email, kind);

-- Service-role only (account-email edge function).
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;
