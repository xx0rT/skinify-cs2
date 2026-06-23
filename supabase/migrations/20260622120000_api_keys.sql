/*
  # API keys for the Skinify public API

  Each row is one developer API key. We store the full key plaintext
  (not hashed) for v1 because:
    - The key itself is a random 32-char token, not derived from a
      password or other secret;
    - Rate-limiting + key revocation are the actual security controls;
    - Users can re-issue from the Profile → Developer tab any time.

  Future v2 may move to hashed storage; that's a one-time migration.

  Index on (key) WHERE is_active for fast lookups (the public-api
  function hits this on every request).
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text UNIQUE NOT NULL,
  name text DEFAULT 'My API key',
  is_active boolean DEFAULT true,
  /* Rate-limit override for this key. NULL = use the default tier. */
  rate_limit_per_min int,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

/* Users can see + manage their own keys via the dashboard. The
   public-api edge function uses the service role so it bypasses RLS
   when validating an inbound key. */
CREATE POLICY "Users manage their own keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = api_keys.user_id
        AND users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = api_keys.user_id
        AND users.auth_user_id = auth.uid()
    )
  );
