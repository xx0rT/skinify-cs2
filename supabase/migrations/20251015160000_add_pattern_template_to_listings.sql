/*
  # Add pattern template to marketplace listings

  1. Changes
    - Add `pattern_template` column to `marketplace_listings` table
    - This stores the Pattern Template number from Steam asset properties

  2. Notes
    - Pattern template is used for specific skins (especially knives and gloves)
    - Pattern number affects the visual appearance of certain skins
*/

-- Add pattern_template column to marketplace_listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings'
    AND column_name = 'pattern_template'
  ) THEN
    ALTER TABLE marketplace_listings
    ADD COLUMN pattern_template text;
  END IF;
END $$;

-- Add index for pattern_template searches
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_pattern_template
  ON marketplace_listings (pattern_template);
