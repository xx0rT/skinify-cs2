/*
  # VIP Subscriptions System

  1. New Tables
    - `vip_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `tier` (text) - 'free', 'vip', 'elite'
      - `plan_type` (text) - 'monthly', 'yearly'
      - `status` (text) - 'active', 'cancelled', 'expired', 'pending'
      - `amount` (numeric) - Subscription amount in CZK
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `next_billing_date` (timestamptz)
      - `revolut_order_id` (text)
      - `auto_renew` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `vip_subscriptions` table
    - Add policies for users to manage their subscriptions
*/

-- Create vip_subscriptions table
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free', 'vip', 'elite')),
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  amount numeric NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  next_billing_date timestamptz,
  revolut_order_id text,
  auto_renew boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_user_id ON vip_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_status ON vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_end_date ON vip_subscriptions(end_date);

-- Enable RLS
ALTER TABLE vip_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON vip_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON vip_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON vip_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vip_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_vip_subscriptions_updated_at ON vip_subscriptions;
CREATE TRIGGER update_vip_subscriptions_updated_at
  BEFORE UPDATE ON vip_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_subscription_updated_at();

-- Add vip_tier column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'vip_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN vip_tier text DEFAULT 'free' CHECK (vip_tier IN ('free', 'vip', 'elite'));
  END IF;
END $$;

-- Add vip_expires_at column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'vip_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN vip_expires_at timestamptz;
  END IF;
END $$;
