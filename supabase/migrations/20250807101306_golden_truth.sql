/*
  # Market Prices Table

  1. New Tables
    - `market_prices`
      - `id` (bigint, primary key, auto-increment)
      - `market_hash_name` (text, unique)
      - `lowest_price` (numeric)
      - `median_price` (numeric) 
      - `volume` (integer)
      - `currency` (text)
      - `last_updated` (timestamptz)
      - `success` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `market_prices` table
    - Add policy for public read access
    - Add policy for service role write access

  3. Indexes
    - Index on market_hash_name for fast lookups
    - Index on last_updated for cache expiration queries
*/

CREATE TABLE IF NOT EXISTS market_prices (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  market_hash_name text UNIQUE NOT NULL,
  lowest_price numeric DEFAULT 0,
  median_price numeric DEFAULT 0,
  volume integer DEFAULT 0,
  currency text DEFAULT 'CZK',
  last_updated timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read market prices)
CREATE POLICY "Allow public read access to market prices"
  ON market_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Allow service role full access to market prices"
  ON market_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_hash_name 
  ON market_prices (market_hash_name);

CREATE INDEX IF NOT EXISTS idx_market_prices_last_updated 
  ON market_prices (last_updated DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_market_prices_updated_at 
  BEFORE UPDATE ON market_prices
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();