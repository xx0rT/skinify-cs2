/*
  # Backfill float values for existing marketplace listings

  1. Changes
    - Add pattern_template column to user_inventories if not exists
    - Update existing marketplace listings to extract float from user_inventories
    - Uses the user_inventories item's float_value when available

  2. Notes
    - This is a one-time update for existing data
    - New listings will have float_value populated automatically
    - User inventories need to be refreshed to get float values from Steam API
*/

-- Add pattern_template column to user_inventories if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_inventories'
    AND column_name = 'pattern_template'
  ) THEN
    ALTER TABLE user_inventories ADD COLUMN pattern_template text;
    CREATE INDEX IF NOT EXISTS idx_user_inventories_pattern_template
      ON user_inventories (pattern_template);
  END IF;
END $$;

-- Update marketplace listings with float values from user_inventories
-- Note: This will only work if user_inventories has float_value populated
-- Users need to refresh their inventory to get float values
UPDATE marketplace_listings ml
SET float_value = inv.float_value
FROM user_inventories inv
WHERE ml.asset_id = inv.asset_id
  AND ml.steam_id = inv.steam_id
  AND ml.float_value IS NULL
  AND inv.float_value IS NOT NULL
  AND inv.float_value != '';

-- Update pattern_template if available
UPDATE marketplace_listings ml
SET pattern_template = inv.pattern_template
FROM user_inventories inv
WHERE ml.asset_id = inv.asset_id
  AND ml.steam_id = inv.steam_id
  AND ml.pattern_template IS NULL
  AND inv.pattern_template IS NOT NULL
  AND inv.pattern_template != '';
