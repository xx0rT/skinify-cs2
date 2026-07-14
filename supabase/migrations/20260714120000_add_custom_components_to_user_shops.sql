/*
  # Custom shop components (drag & edit designer)

  Array of owner-created blocks rendered on the public shop page:
    [{ "id": "...", "kind": "text"|"image"|"button"|"divider",
       "text"?, "url"?, "label"?, "size"? }]
  Positions/scales live in element_layout under the `block:<id>` keys.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_shops'
    AND column_name = 'custom_components'
  ) THEN
    ALTER TABLE user_shops ADD COLUMN custom_components jsonb;
  END IF;
END $$;
