/*
  # Add Auction and Private Listing Features

  1. Changes to `marketplace_listings` table
    - Add `listing_type` (standard, auction, private)
    - Add `auction_end_time` for auction listings
    - Add `current_bid` for auction current bid
    - Add `minimum_bid` for auction minimum bid
    - Add `buyout_price` for instant buy on auctions
    - Add `private_buyer_steam_id` for private listings
    - Add `reserve_price` for auction reserve price
    - Add `bid_count` to track number of bids

  2. Create `auction_bids` table
    - Track all bids on auction items
    - Include bid amount, bidder info, timestamp

  3. Security
    - Update RLS policies for private listings
    - Add policies for auction bids

  4. Notes
    - Standard listings work as before
    - Auction listings have time limits and bidding
    - Private listings only visible to specific buyer
*/

-- Add new columns to marketplace_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'listing_type'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN listing_type text DEFAULT 'standard' CHECK (listing_type IN ('standard', 'auction', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'auction_end_time'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN auction_end_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'current_bid'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN current_bid numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'minimum_bid'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN minimum_bid numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'buyout_price'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN buyout_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'private_buyer_steam_id'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN private_buyer_steam_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'reserve_price'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN reserve_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'bid_count'
  ) THEN
    ALTER TABLE marketplace_listings ADD COLUMN bid_count integer DEFAULT 0;
  END IF;
END $$;

-- Create auction_bids table
CREATE TABLE IF NOT EXISTS auction_bids (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  listing_id bigint REFERENCES marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  bidder_steam_id text NOT NULL,
  bidder_name text NOT NULL,
  bid_amount numeric NOT NULL,
  is_current_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on auction_bids
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Public can read bids on active auctions
CREATE POLICY "Allow public read access to auction bids"
  ON auction_bids
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_listings
      WHERE marketplace_listings.id = auction_bids.listing_id
      AND marketplace_listings.is_active = true
      AND marketplace_listings.listing_type = 'auction'
    )
  );

-- Users can insert their own bids
CREATE POLICY "Users can create their own bids"
  ON auction_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (bidder_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid()));

-- Only auction owner can see all bids
CREATE POLICY "Auction owners can see all bids"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_listings
      WHERE marketplace_listings.id = auction_bids.listing_id
      AND marketplace_listings.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to auction bids"
  ON auction_bids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update RLS policy for private listings
DROP POLICY IF EXISTS "Allow public read access to active listings" ON marketplace_listings;

CREATE POLICY "Allow public read access to active listings"
  ON marketplace_listings
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (
      listing_type IN ('standard', 'auction')
      OR (
        listing_type = 'private'
        AND private_buyer_steam_id = (SELECT steam_id FROM users WHERE id = auth.uid())
      )
      OR user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_bids_listing ON auction_bids (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder ON auction_bids (bidder_steam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_auction_end ON marketplace_listings (auction_end_time) WHERE listing_type = 'auction' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_private_buyer ON marketplace_listings (private_buyer_steam_id) WHERE listing_type = 'private' AND is_active = true;

-- Create function to update current bid on marketplace_listings
CREATE OR REPLACE FUNCTION update_auction_current_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings
  SET
    current_bid = NEW.bid_amount,
    bid_count = bid_count + 1,
    updated_at = now()
  WHERE id = NEW.listing_id;

  -- Mark previous winner as no longer winning
  UPDATE auction_bids
  SET is_current_winner = false
  WHERE listing_id = NEW.listing_id
  AND id != NEW.id;

  -- Mark new bid as winning
  NEW.is_current_winner = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bid updates
DROP TRIGGER IF EXISTS trigger_update_auction_bid ON auction_bids;
CREATE TRIGGER trigger_update_auction_bid
  BEFORE INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_current_bid();
