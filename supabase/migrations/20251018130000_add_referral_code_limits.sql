/*
  # Add Referral Code Usage Limits

  1. Changes
    - Add `max_uses` column to users table for referral code limit
    - Add `current_uses` column to track how many times code has been used
    - Add function to check if referral code can still be used
    - Update trigger to enforce limits

  2. Security
    - Maintain existing RLS policies
    - Ensure referral codes can't be used beyond their limit
*/

-- Add referral code usage tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_max_uses'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_max_uses integer DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_current_uses'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_current_uses integer DEFAULT 0;
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_usage ON users (referral_code, referral_current_uses, referral_max_uses) WHERE referral_code IS NOT NULL;

-- Function to check if referral code is still valid
CREATE OR REPLACE FUNCTION is_referral_code_valid(code text)
RETURNS boolean AS $$
DECLARE
  max_uses integer;
  current_uses integer;
BEGIN
  SELECT referral_max_uses, referral_current_uses
  INTO max_uses, current_uses
  FROM users
  WHERE referral_code = code
  LIMIT 1;

  IF max_uses IS NULL OR current_uses IS NULL THEN
    RETURN false;
  END IF;

  RETURN current_uses < max_uses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment referral code usage
CREATE OR REPLACE FUNCTION increment_referral_usage(code text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET referral_current_uses = referral_current_uses + 1
  WHERE referral_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function to check usage limits
CREATE OR REPLACE FUNCTION set_referred_by_from_code()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id uuid;
  code_valid boolean;
BEGIN
  -- If user has a stored referral code in metadata, look up the referrer
  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    -- Check if code is valid and hasn't reached usage limit
    SELECT is_referral_code_valid(NEW.raw_user_meta_data->>'referral_code') INTO code_valid;

    IF code_valid THEN
      SELECT id INTO referrer_user_id
      FROM users
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      LIMIT 1;

      IF referrer_user_id IS NOT NULL THEN
        NEW.referred_by = referrer_user_id;

        -- Increment usage count
        PERFORM increment_referral_usage(NEW.raw_user_meta_data->>'referral_code');
      END IF;
    ELSE
      -- Code has reached its usage limit or is invalid
      RAISE NOTICE 'Referral code has reached its usage limit or is invalid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS set_referred_by_on_signup ON users;
CREATE TRIGGER set_referred_by_on_signup
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_referred_by_from_code();

-- Initialize existing users' referral codes with default limits
UPDATE users
SET
  referral_max_uses = COALESCE(referral_max_uses, 10),
  referral_current_uses = COALESCE(referral_current_uses, 0)
WHERE referral_code IS NOT NULL;
