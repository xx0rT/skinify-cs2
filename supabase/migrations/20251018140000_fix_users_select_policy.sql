/*
  # Fix Users Table RLS Policy for Referral Code Access

  1. Changes
    - Add policy to allow users to read their own referral code data
    - Allow authenticated users to read basic user info for referrals

  2. Security
    - Users can read their own data including referral codes
    - Maintains privacy while allowing referral functionality
*/

-- Drop conflicting policy if exists
DROP POLICY IF EXISTS "Users can view referral information" ON users;

-- Allow users to read their own user data including referral codes
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

-- Allow users to read basic info about users they referred or who referred them
CREATE POLICY "Users can view referral chain"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    referred_by = auth.uid() OR
    id IN (SELECT referred_by FROM users WHERE id = auth.uid())
  );
