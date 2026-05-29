/*
  # Fix Unique Active Listing Constraint

  1. Changes
    - Drop the existing unique constraint that doesn't consider is_active status
    - Add a new partial unique index that only applies to active listings
    - This allows the same item to be listed again after being delisted

  2. Details
    - The constraint was preventing re-listing of items that were previously delisted
    - New index: unique_active_listing_idx only applies WHERE is_active = true
    - Inactive listings (is_active = false) are now ignored by the uniqueness check
*/

-- Drop the old constraint that doesn't consider is_active
ALTER TABLE marketplace_listings
DROP CONSTRAINT IF EXISTS unique_active_listing;

-- Create a partial unique index that only applies to active listings
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_listing_idx
ON marketplace_listings (steam_id, asset_id)
WHERE is_active = true;
