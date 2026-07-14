/*
  # Add pattern (paint seed / pattern template) to the inventory cache

  user_inventories caches parsed Steam inventories. It stored float_value
  but not the pattern template, so items listed while the inventory was
  served from cache lost their paint seed. Add the column so pattern
  survives the cache round-trip.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_inventories'
    AND column_name = 'pattern'
  ) THEN
    ALTER TABLE user_inventories ADD COLUMN pattern text;
  END IF;
END $$;
