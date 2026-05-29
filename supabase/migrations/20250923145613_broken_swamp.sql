/*
  # Hot Items Promotion System

  1. New Tables
    - `hot_items`
      - `id` (bigint, primary key)
      - `listing_id` (bigint, foreign key to marketplace_listings)
      - `user_steam_id` (text, reference to users)
      - `asset_id` (text, item asset ID)
      - `promoted_at` (timestamp, when promotion was purchased)
      - `expires_at` (timestamp, when promotion expires)
      - `payment_amount` (numeric, amount paid for promotion)
      - `payment_reference` (text, payment transaction reference)
      - `is_active` (boolean, whether promotion is currently active)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `hot_items` table
    - Add policies for users to manage their own hot items
    - Add policy for public read access to active hot items

  3. Indexes
    - Index on user_steam_id for user lookups
    - Index on expires_at for cleanup queries
    - Index on is_active for active hot items queries
*/

CREATE TABLE IF NOT EXISTS hot_items (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  listing_id bigint NOT NULL,
  user_steam_id text NOT NULL,
  asset_id text NOT NULL,
  item_name text NOT NULL,
  market_hash_name text NOT NULL,
  item_type text,
  rarity text,
  condition text,
  price numeric NOT NULL,
  image_url text,
  promoted_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payment_amount numeric DEFAULT 5.00,
  payment_currency text DEFAULT 'USD',
  payment_reference text,
  is_active boolean DEFAULT true,
  views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Foreign key constraint
ALTER TABLE hot_items 
ADD CONSTRAINT hot_items_listing_id_fkey 
FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hot_items_user_steam_id ON hot_items (user_steam_id);
CREATE INDEX IF NOT EXISTS idx_hot_items_expires_at ON hot_items (expires_at);
CREATE INDEX IF NOT EXISTS idx_hot_items_active ON hot_items (is_active, expires_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hot_items_listing ON hot_items (listing_id);

-- Enable RLS
ALTER TABLE hot_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to active hot items"
  ON hot_items
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can manage their own hot items"
  ON hot_items
  FOR ALL
  TO authenticated
  USING (user_steam_id = current_setting('app.current_user_steam_id', true))
  WITH CHECK (user_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Service role full access to hot items"
  ON hot_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically deactivate expired hot items
CREATE OR REPLACE FUNCTION deactivate_expired_hot_items()
RETURNS void AS $$
BEGIN
  UPDATE hot_items 
  SET is_active = false, 
      updated_at = now()
  WHERE is_active = true 
    AND expires_at <= now();
END;
$$ LANGUAGE plpgsql;