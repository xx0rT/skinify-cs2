/*
  # Create System Settings

  1. New Tables
    - `system_settings` - Platform configuration settings
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting identifier
      - `value` (jsonb) - Setting value
      - `description` (text) - Human-readable description
      - `category` (text) - Setting category
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Only admins can manage settings
    - Authenticated users can view settings

  3. Initial Settings
    - Commission rates
    - Withdrawal limits
    - Security settings
*/

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view settings
CREATE POLICY "Users can view settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

-- Insert default settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('marketplace_commission', '{"percentage": 5}', 'Commission percentage taken from marketplace sales', 'finance'),
  ('withdrawal_minimum', '{"amount": 100}', 'Minimum withdrawal amount in CZK', 'finance'),
  ('withdrawal_maximum', '{"amount": 100000}', 'Maximum withdrawal amount per transaction in CZK', 'finance'),
  ('daily_withdrawal_limit', '{"amount": 500000}', 'Maximum total withdrawals per user per day in CZK', 'finance'),
  ('require_email_verification', '{"enabled": false}', 'Require users to verify email before trading', 'security'),
  ('require_steam_guard', '{"enabled": true}', 'Require Steam Guard to be enabled for trading', 'security'),
  ('max_login_attempts', '{"attempts": 5, "lockout_minutes": 30}', 'Maximum login attempts before temporary lockout', 'security'),
  ('maintenance_mode', '{"enabled": false, "message": "System maintenance in progress"}', 'Enable maintenance mode for the platform', 'system'),
  ('trading_enabled', '{"enabled": true}', 'Enable or disable trading functionality', 'system'),
  ('new_user_bonus', '{"amount": 50}', 'Welcome bonus for new users in CZK', 'finance')
ON CONFLICT (key) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
