/*
  # Cache inspect links in user_inventories

  The inventory parser already resolves each item's steam:// inspect link
  (with owner/asset substituted), but the cache didn't persist it — so
  listings created from cache and the backfill had no inspect_link.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_inventories'
    AND column_name = 'inspect_link'
  ) THEN
    ALTER TABLE user_inventories ADD COLUMN inspect_link text;
  END IF;
END $$;
