/*
  # Add Share Tokens for Private Listings

  1. Changes
    - Add `share_token` column to `marketplace_listings` table
    - Generate unique secure tokens for shareable URLs
    - Add index for fast token lookups
    - Backfill existing private listings with tokens
  
  2. Security
    - Tokens are UUID v4 for security
    - Indexed for performance
    - Required for private listings to be shared securely
*/

-- Add share_token column to marketplace_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE marketplace_listings 
    ADD COLUMN share_token uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_share_token 
ON marketplace_listings(share_token) 
WHERE share_token IS NOT NULL;

-- Backfill existing listings with tokens
UPDATE marketplace_listings 
SET share_token = gen_random_uuid() 
WHERE share_token IS NULL;

-- Create function to generate new token on listing creation
CREATE OR REPLACE FUNCTION generate_listing_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tokens
DROP TRIGGER IF EXISTS trigger_generate_listing_share_token ON marketplace_listings;
CREATE TRIGGER trigger_generate_listing_share_token
  BEFORE INSERT ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_share_token();