/*
  # Freeform shop layout (drag & edit mode)

  Stores per-element transforms from the shop's drag & edit designer:
    { "<elementId>": { "x": <px>, "y": <px>, "scale": <factor> } }
  Element ids: banner, logo, title, bio, stats, socials, items.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_shops'
    AND column_name = 'element_layout'
  ) THEN
    ALTER TABLE user_shops ADD COLUMN element_layout jsonb;
  END IF;
END $$;
