/*
  # User Inventories Cache Table

  1. New Tables
    - `user_inventories`
      - `id` (bigint, primary key, auto-increment)
      - `steam_id` (text, not null)
      - `asset_id` (text, not null)
      - `class_id` (text, not null)
      - `instance_id` (text, not null)
      - `market_name` (text)
      - `item_name` (text)
      - `item_type` (text)
      - `rarity` (text)
      - `condition` (text)
      - `price_estimate` (numeric)
      - `image_url` (text)
      - `tradable` (boolean)
      - `marketable` (boolean)
      - `float_value` (text)
      - `stickers` (text[])
      - `last_updated` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_inventories` table
    - Users can only access their own inventory data
    - Service role has full access

  3. Indexes
    - Index on steam_id for fast user inventory lookups
    - Index on asset_id for individual item lookups
    - Index on last_updated for cache expiration
*/

CREATE TABLE IF NOT EXISTS user_inventories (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  steam_id text NOT NULL,
  asset_id text NOT NULL,
  class_id text NOT NULL,
  instance_id text NOT NULL,
  market_name text,
  item_name text,
  item_type text,
  rarity text,
  condition text,
  price_estimate numeric DEFAULT 0,
  image_url text,
  tradable boolean DEFAULT false,
  marketable boolean DEFAULT false,
  float_value text,
  stickers text[],
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_inventories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own inventory data
CREATE POLICY "Users can access their own inventory"
  ON user_inventories
  FOR ALL
  TO authenticated
  USING (
    steam_id IN (
      SELECT users.steam_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    steam_id IN (
      SELECT users.steam_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Service role can access all inventories
CREATE POLICY "Service role can access all inventories"
  ON user_inventories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous users can read inventories (for marketplace)
CREATE POLICY "Allow anonymous read access to inventories"
  ON user_inventories
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_inventories_steam_id 
  ON user_inventories (steam_id);

CREATE INDEX IF NOT EXISTS idx_user_inventories_asset_id 
  ON user_inventories (asset_id);

CREATE INDEX IF NOT EXISTS idx_user_inventories_last_updated 
  ON user_inventories (last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_user_inventories_rarity 
  ON user_inventories (rarity);

CREATE INDEX IF NOT EXISTS idx_user_inventories_price 
  ON user_inventories (price_estimate DESC);

-- Unique constraint to prevent duplicate items
ALTER TABLE user_inventories 
ADD CONSTRAINT unique_user_inventory_item 
UNIQUE (steam_id, asset_id);