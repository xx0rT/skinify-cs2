-- Trusted devices / login sessions for 2FA "remember this device" and the
-- Settings → Sessions list.
--
-- When a user passes a 2FA challenge and chooses to trust the device, we
-- store a random device_token (also kept in the browser's localStorage)
-- and mark it trusted=true. Future logins from a device presenting a
-- known trusted token skip the 2FA prompt. Every login also records/updates
-- a row so the user can see and revoke active sessions (ip, user agent,
-- last seen).

CREATE TABLE IF NOT EXISTS user_devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  steam_id      text,
  device_token  text NOT NULL,
  trusted       boolean NOT NULL DEFAULT false,
  ip            text,
  user_agent    text,
  device_name   text,           -- friendly derived label, e.g. "Chrome on macOS"
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON user_devices (device_token);

-- Service-role only (the two-factor edge function manages these rows).
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
