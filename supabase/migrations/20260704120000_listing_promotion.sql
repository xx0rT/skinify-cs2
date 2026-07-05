/*
  # Paid listing promotion

  Adds the promotion flag to marketplace_listings. A listing becomes
  promoted when the seller pays the 49 CZK fee (charged through the
  balance function as a completed `purchase` transaction). Promoted
  listings surface in the homepage promoted rail and at the top of the
  marketplace for 7 days (promoted_until).
*/

ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false;
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_promoted
  ON marketplace_listings (is_promoted, promoted_until)
  WHERE is_promoted = true;
