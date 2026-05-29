/*
  # Create marketplace listings system

  1. New Tables
    - `marketplace_listings`
      - `id` (bigint, primary key, auto-increment)
      - `user_id` (uuid, foreign key to users.id)
      - `steam_id` (text, seller's Steam ID)
      - `asset_id` (text, Steam asset ID)
      - `market_hash_name` (text, item name)
      - `item_name` (text, display name)
      - `item_type` (text, weapon type)
      - `rarity` (text, item rarity)
      - `condition` (text, wear condition)
      - `price` (numeric, listing price)
      - `image_url` (text, item image)
      - `float_value` (text, float if available)
      - `stickers` (text array, sticker names)
      - `description` (text, seller description)
      - `is_active` (boolean, listing status)
      - `views` (integer, view count)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `marketplace_listings` table
    - Add policies for public read access
    - Add policies for users to manage their own listings

  3. Indexes
    - Index on market_hash_name for searching
    - Index on price for sorting
    - Index on rarity for filtering
    - Index on is_active for active listings
*/

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  steam_id text NOT NULL,
  asset_id text NOT NULL,
  market_hash_name text NOT NULL,
  item_name text NOT NULL,
  item_type text,
  rarity text,
  condition text,
  price numeric NOT NULL,
  image_url text,
  float_value text,
  stickers text[],
  description text,
  is_active boolean DEFAULT true,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Public can read active listings
CREATE POLICY "Allow public read access to active listings"
  ON marketplace_listings
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Users can manage their own listings
CREATE POLICY "Users can manage own listings"
  ON marketplace_listings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role full access to listings"
  ON marketplace_listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active ON marketplace_listings (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings (price DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_rarity ON marketplace_listings (rarity) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_market_name ON marketplace_listings (market_hash_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user ON marketplace_listings (user_id, is_active);

-- Add unique constraint to prevent duplicate listings
ALTER TABLE marketplace_listings 
ADD CONSTRAINT unique_active_listing UNIQUE (steam_id, asset_id) DEFERRABLE INITIALLY DEFERRED;