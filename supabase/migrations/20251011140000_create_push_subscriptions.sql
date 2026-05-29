/*
  # Create Push Subscriptions Table

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `user_steam_id` (text, foreign key to users)
      - `endpoint` (text, unique push endpoint)
      - `subscription` (jsonb, full subscription object with keys)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `push_subscriptions` table
    - Users can only manage their own subscriptions
    - Service role can access all subscriptions for sending pushnotifications

  3. Indexes
    - Index on user_steam_id for fast lookups
    - Index on endpoint for deduplication
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_steam_id text NOT NULL REFERENCES users(steam_id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_steam_id
  ON push_subscriptions(user_steam_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()))
  WITH CHECK (user_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Service role can access all push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
