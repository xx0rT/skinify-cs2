/*
  # User Referral Tracking Enhancement

  1. Changes
    - Add `referred_by` column to users table to track who referred the user
    - Add index for fast referral lookups
    - Update RLS policies to allow users to see referral information

  2. Security
    - Users can see who referred them
    - Users can see who they referred
    - Maintain existing RLS policies
*/

-- Add referred_by column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by) WHERE referred_by IS NOT NULL;

-- Function to automatically set referred_by when user signs up with referral code
CREATE OR REPLACE FUNCTION set_referred_by_from_code()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id uuid;
BEGIN
  -- If user has a stored referral code in metadata, look up the referrer
  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    SELECT id INTO referrer_user_id
    FROM users
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
    LIMIT 1;

    IF referrer_user_id IS NOT NULL THEN
      NEW.referred_by = referrer_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set referred_by on user creation
DROP TRIGGER IF EXISTS set_referred_by_on_signup ON users;
CREATE TRIGGER set_referred_by_on_signup
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_referred_by_from_code();

-- Update users RLS policy to allow viewing referral info
DROP POLICY IF EXISTS "Users can view referral information" ON users;
CREATE POLICY "Users can view referral information"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    referred_by = auth.uid() OR
    id IN (SELECT referred_by FROM users WHERE id = auth.uid())
  );
