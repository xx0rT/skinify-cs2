/*
  # CS2 Float Data Storage

  1. New Tables
    - `cs2_float_data`
      - `id` (bigint, primary key)
      - `steam_id` (text, user's Steam ID)
      - `asset_id` (text, Steam asset ID)
      - `item_name` (text, item name)
      - `float_value` (numeric, precise float value)
      - `paint_seed` (integer, paint pattern seed)
      - `min_float` (numeric, minimum possible float)
      - `max_float` (numeric, maximum possible float)
      - `weapon_type` (text, weapon category)
      - `inspect_link` (text, Steam inspect URL)
      - `stickers` (jsonb, applied stickers data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `cs2_float_data` table
    - Add policy for public read access
    - Add policy for service role full access

  3. Indexes
    - Steam ID index for efficient lookups
    - Asset ID index for uniqueness
    - Float value index for sorting
    - Updated timestamp index for freshness queries
*/

CREATE TABLE IF NOT EXISTS cs2_float_data (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  steam_id text NOT NULL,
  asset_id text NOT NULL,
  item_name text NOT NULL,
  float_value numeric(10, 8) NOT NULL,
  paint_seed integer NOT NULL,
  min_float numeric(10, 8) DEFAULT 0,
  max_float numeric(10, 8) DEFAULT 1,
  weapon_type text,
  inspect_link text NOT NULL,
  stickers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicates
ALTER TABLE cs2_float_data 
ADD CONSTRAINT unique_steam_asset UNIQUE (steam_id, asset_id);

-- Enable Row Level Security
ALTER TABLE cs2_float_data ENABLE ROW LEVEL SECURITY;

-- Public read access policy
CREATE POLICY "Allow public read access to float data"
  ON cs2_float_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role full access policy
CREATE POLICY "Service role full access to float data"
  ON cs2_float_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_cs2_float_steam_id 
  ON cs2_float_data (steam_id);

CREATE INDEX IF NOT EXISTS idx_cs2_float_asset_id 
  ON cs2_float_data (asset_id);

CREATE INDEX IF NOT EXISTS idx_cs2_float_value 
  ON cs2_float_data (float_value DESC);

CREATE INDEX IF NOT EXISTS idx_cs2_float_paint_seed 
  ON cs2_float_data (paint_seed);

CREATE INDEX IF NOT EXISTS idx_cs2_float_updated_at 
  ON cs2_float_data (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs2_float_weapon_type 
  ON cs2_float_data (weapon_type) 
  WHERE weapon_type IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_cs2_float_steam_weapon 
  ON cs2_float_data (steam_id, weapon_type, float_value DESC);