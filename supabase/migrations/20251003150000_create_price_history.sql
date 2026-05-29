/*
  # Create Price History Table

  1. New Tables
    - `marketplace_price_history`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to marketplace_listings)
      - `price` (numeric, the price at this point in time)
      - `recorded_at` (timestamptz, when the price was recorded)
      - `created_at` (timestamptz, record creation time)

  2. Indexes
    - Index on `listing_id` and `recorded_at` for efficient price history queries
    - Index on `recorded_at` for time-based queries

  3. Security
    - Enable RLS on `marketplace_price_history` table
    - Add policy for public read access to price history
    - Add policy for authenticated users to insert price records (for system use)
*/

-- Create price history table
CREATE TABLE IF NOT EXISTS marketplace_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON marketplace_price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON marketplace_price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_listing_recorded ON marketplace_price_history(listing_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE marketplace_price_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read price history (public data)
CREATE POLICY "Anyone can view price history"
  ON marketplace_price_history
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert price history (for system/automation)
CREATE POLICY "Authenticated users can insert price history"
  ON marketplace_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically record price history when listing is created
CREATE OR REPLACE FUNCTION record_initial_price_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO marketplace_price_history (listing_id, price, recorded_at)
  VALUES (NEW.id, NEW.price, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to record initial price when listing is created
DROP TRIGGER IF EXISTS trigger_record_initial_price ON marketplace_listings;
CREATE TRIGGER trigger_record_initial_price
  AFTER INSERT ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION record_initial_price_history();

-- Function to record price history when price changes
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if price actually changed
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO marketplace_price_history (listing_id, price, recorded_at)
    VALUES (NEW.id, NEW.price, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to record price changes
DROP TRIGGER IF EXISTS trigger_record_price_change ON marketplace_listings;
CREATE TRIGGER trigger_record_price_change
  AFTER UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION record_price_change();
