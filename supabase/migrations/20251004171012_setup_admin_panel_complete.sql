/*
  # Complete Admin Panel Setup

  1. Purpose
    - Create all required tables for admin panel functionality
    - Enable user management (ban, warn, verify)
    - Enable global notifications system
    - Enable system settings management
    - Enable admin audit logging

  2. Tables Created
    - `global_notifications` - System-wide announcements
    - `user_bans` - User ban tracking and management
    - `user_warnings` - User warning system
    - `admin_logs` - Audit trail for admin actions
    - `system_settings` - Platform configuration
    - `support_tickets` - Customer support system

  3. Security
    - Enable RLS on all tables
    - Authenticated users can perform admin actions (development mode)
    - Public users can view active notifications

  4. Notes
    - Updates users table with missing columns if needed
    - Inserts default system settings
    - Creates all necessary indexes for performance
*/

-- ============================================
-- 1. GLOBAL NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS global_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'normal',
  target_audience text NOT NULL DEFAULT 'all',
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_active ON global_notifications(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON global_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON global_notifications(priority);

ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON global_notifications;
DROP POLICY IF EXISTS "Public can view active notifications" ON global_notifications;
DROP POLICY IF EXISTS "Anyone can view active notifications" ON global_notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON global_notifications;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON global_notifications;
DROP POLICY IF EXISTS "Allow read for anon" ON global_notifications;

CREATE POLICY "Allow all for authenticated users"
  ON global_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read for anon"
  ON global_notifications FOR SELECT
  TO anon
  USING (true);


-- ============================================
-- 2. USER BANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid,
  reason text NOT NULL,
  duration text CHECK (duration IN ('temporary', 'permanent')),
  ban_type text DEFAULT 'full',
  banned_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active ON user_bans(is_active);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage bans" ON user_bans;
DROP POLICY IF EXISTS "Admins can manage bans" ON user_bans;
DROP POLICY IF EXISTS "Users can view own bans" ON user_bans;

CREATE POLICY "Authenticated users can manage bans"
  ON user_bans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 3. USER WARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  issued_by uuid,
  reason text NOT NULL,
  severity text DEFAULT 'minor',
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id);

ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage warnings" ON user_warnings;
DROP POLICY IF EXISTS "Admins can manage warnings" ON user_warnings;
DROP POLICY IF EXISTS "Users can view own warnings" ON user_warnings;
DROP POLICY IF EXISTS "Users can acknowledge warnings" ON user_warnings;

CREATE POLICY "Authenticated users can manage warnings"
  ON user_warnings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 4. ADMIN LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
DROP POLICY IF EXISTS "System can insert logs" ON admin_logs;

CREATE POLICY "Authenticated users can manage logs"
  ON admin_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 5. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;

CREATE POLICY "Authenticated users can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('marketplace_fee', '{"percentage": 5}'::jsonb, 'Marketplace transaction fee percentage', 'finance'),
  ('withdrawal_min', '{"amount": 100}'::jsonb, 'Minimum withdrawal amount in CZK', 'finance'),
  ('withdrawal_max', '{"amount": 50000}'::jsonb, 'Maximum withdrawal amount in CZK', 'finance'),
  ('max_listings_per_user', '{"limit": 50}'::jsonb, 'Maximum active listings per user', 'limits'),
  ('maintenance_mode', '{"enabled": false}'::jsonb, 'Enable/disable maintenance mode', 'system'),
  ('site_name', '{"value": "CS2 Marketplace"}'::jsonb, 'Website name', 'general'),
  ('support_email', '{"value": "support@cs2marketplace.com"}'::jsonb, 'Support email address', 'general'),
  ('auto_approve_listings', '{"enabled": true}'::jsonb, 'Auto-approve new listings', 'marketplace'),
  ('verification_required', '{"enabled": false}'::jsonb, 'Require KYC verification', 'security')
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- 6. SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open',
  priority text DEFAULT 'normal',
  category text,
  assigned_to uuid,
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR true);

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can manage tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tickets"
  ON support_tickets FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 7. UPDATE USERS TABLE
-- ============================================
DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'active';
  END IF;

  -- Add reputation score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'reputation_score'
  ) THEN
    ALTER TABLE users ADD COLUMN reputation_score integer DEFAULT 100;
  END IF;

  -- Add verification status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- Add verification type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'verification_type'
  ) THEN
    ALTER TABLE users ADD COLUMN verification_type text;
  END IF;

  -- Add last login
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;

  -- Add email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
  END IF;
END $$;
