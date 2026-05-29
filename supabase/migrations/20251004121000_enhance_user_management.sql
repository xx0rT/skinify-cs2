/*
  # Enhanced User Management

  1. Modifications
    - Add user status, roles, and moderation fields
    - Add reputation and verification fields
    - Add account suspension tracking

  2. New Tables
    - `user_bans` - Ban history and management
    - `user_warnings` - Warning system
    - `user_reputation` - Reputation scores and history
    - `account_links` - Multi-account detection
*/

-- Add new columns to users table (if they don't exist)
DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'pending_verification'));
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

-- User Bans Table
CREATE TABLE IF NOT EXISTS user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES auth.users(id),
  reason text NOT NULL,
  duration text CHECK (duration IN ('temporary', 'permanent')),
  ban_type text DEFAULT 'full' CHECK (ban_type IN ('full', 'trading', 'messaging', 'listing')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bans"
  ON user_bans FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own bans"
  ON user_bans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User Warnings Table
CREATE TABLE IF NOT EXISTS user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  issued_by uuid REFERENCES auth.users(id),
  reason text NOT NULL,
  severity text DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warnings"
  ON user_warnings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own warnings"
  ON user_warnings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge warnings"
  ON user_warnings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND acknowledged = true);

-- User Reputation Table
CREATE TABLE IF NOT EXISTS user_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  points integer NOT NULL,
  reason text,
  related_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reputation history"
  ON user_reputation FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can add reputation"
  ON user_reputation FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Account Links (Multi-account detection)
CREATE TABLE IF NOT EXISTS account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('same_ip', 'same_device', 'same_payment', 'behavioral')),
  confidence numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  UNIQUE(user_id_1, user_id_2, link_type)
);

ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view account links"
  ON account_links FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_user_ids ON account_links(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_account_links_reviewed ON account_links(reviewed);
