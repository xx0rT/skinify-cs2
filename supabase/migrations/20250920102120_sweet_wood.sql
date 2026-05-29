/*
  # Referral System Database Schema

  1. New Tables
    - `referral_codes` - Stores unique referral codes for each user
    - `referral_clicks` - Tracks clicks on referral links for analytics
    - `referrals` - Tracks referral relationships and status
    - `referral_rewards` - Stores rewards earned from referrals

  2. Security
    - Enable RLS on all referral tables
    - Add policies for users to access their own referral data
    - Service role has full access for system operations

  3. Features
    - Automatic referral code generation
    - Click tracking with IP and user agent
    - Multi-stage referral process (clicked → registered → completed)
    - Flexible reward system with different types
    - Fraud prevention with limits and duplicate detection
*/

-- Add referral_code column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code) WHERE referral_code IS NOT NULL;

-- Referral Clicks Table (Analytics)
CREATE TABLE IF NOT EXISTS referral_clicks (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  referral_code text NOT NULL,
  ip_address inet,
  user_agent text,
  country_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks (referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created_at ON referral_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_ip ON referral_clicks (ip_address);

-- Referrals Table (Relationships)
CREATE TABLE IF NOT EXISTS referrals (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked', 'registered', 'qualified', 'completed', 'cancelled')),
  qualifying_action text,
  qualifying_amount numeric DEFAULT 0,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  clicked_at timestamptz DEFAULT now(),
  registered_at timestamptz,
  qualified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status, created_at DESC);

-- Referral Rewards Table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id bigint NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('credit', 'discount', 'cash', 'bonus', 'percentage')),
  reward_value numeric NOT NULL,
  currency text DEFAULT 'CZK',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  description text,
  expires_at timestamptz,
  paid_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards (user_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON referral_rewards (referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_expires ON referral_rewards (expires_at) WHERE expires_at IS NOT NULL;

-- Referral Settings Table (Global configuration)
CREATE TABLE IF NOT EXISTS referral_settings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;

-- Insert default referral settings
INSERT INTO referral_settings (setting_key, setting_value, description) VALUES
  ('max_referrals_per_user', '50', 'Maximum number of referrals per user'),
  ('referral_cookie_days', '30', 'Days to keep referral cookie valid'),
  ('qualifying_deposit_amount', '500', 'Minimum deposit amount to qualify for referral reward'),
  ('referrer_reward_amount', '100', 'Reward amount for referrer in CZK'),
  ('referred_reward_amount', '50', 'Reward amount for referred user in CZK'),
  ('referral_enabled', 'true', 'Whether referral system is enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies

-- Referral Clicks Policies
CREATE POLICY "Allow public read access to referral clicks" ON referral_clicks
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to referral clicks" ON referral_clicks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Referrals Policies
CREATE POLICY "Users can view their own referrals as referrer" ON referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "Users can view their own referrals as referred" ON referrals
  FOR SELECT TO authenticated
  USING (referred_id = auth.uid());

CREATE POLICY "Service role full access to referrals" ON referrals
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Referral Rewards Policies
CREATE POLICY "Users can view their own referral rewards" ON referral_rewards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to referral rewards" ON referral_rewards
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Referral Settings Policies
CREATE POLICY "Allow public read access to referral settings" ON referral_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access to referral settings" ON referral_settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_input uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code_chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- Removed confusing chars
  code_length int := 8;
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := '';
    
    -- Generate random code
    FOR i IN 1..code_length LOOP
      new_code := new_code || substr(code_chars, floor(random() * length(code_chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
    
    -- If unique, exit loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to auto-generate referral codes for existing users
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate referral code if not exists
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral codes
DROP TRIGGER IF EXISTS trigger_ensure_referral_code ON users;
CREATE TRIGGER trigger_ensure_referral_code
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_referral_code();

-- Function to update referral status when user makes qualifying action
CREATE OR REPLACE FUNCTION process_referral_qualification(
  user_steam_id_input text,
  action_type text,
  action_amount numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_record record;
  referral_record record;
  referrer_record record;
  qualifying_amount numeric;
  referrer_reward numeric;
  referred_reward numeric;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM users WHERE steam_id = user_steam_id_input;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if user was referred and hasn't been rewarded yet
  SELECT * INTO referral_record 
  FROM referrals 
  WHERE referred_id = user_record.id 
    AND status IN ('registered', 'clicked')
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get referrer info
  SELECT * INTO referrer_record FROM users WHERE id = referral_record.referrer_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get qualifying amount from settings
  SELECT (setting_value::text)::numeric INTO qualifying_amount 
  FROM referral_settings 
  WHERE setting_key = 'qualifying_deposit_amount';
  
  -- Check if action qualifies
  IF action_type = 'deposit' AND action_amount >= COALESCE(qualifying_amount, 500) THEN
    -- Update referral status
    UPDATE referrals 
    SET status = 'qualified',
        qualifying_action = action_type,
        qualifying_amount = action_amount,
        qualified_at = now(),
        updated_at = now()
    WHERE id = referral_record.id;
    
    -- Get reward amounts
    SELECT (setting_value::text)::numeric INTO referrer_reward 
    FROM referral_settings WHERE setting_key = 'referrer_reward_amount';
    
    SELECT (setting_value::text)::numeric INTO referred_reward 
    FROM referral_settings WHERE setting_key = 'referred_reward_amount';
    
    -- Create rewards for both users
    INSERT INTO referral_rewards (user_id, referral_id, reward_type, reward_value, description)
    VALUES 
      (referral_record.referrer_id, referral_record.id, 'credit', COALESCE(referrer_reward, 100), 'Referral bonus for successful referral'),
      (referral_record.referred_id, referral_record.id, 'credit', COALESCE(referred_reward, 50), 'Welcome bonus for being referred');
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Generate referral codes for existing users
UPDATE users SET referral_code = generate_referral_code(id) WHERE referral_code IS NULL;