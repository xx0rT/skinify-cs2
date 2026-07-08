-- Advanced shop-editor controls. Everything a seller can now tweak in the
-- full-screen editor that didn't already have a column. Section visibility
-- and the item-detail-modal look are kept in a single jsonb blob so future
-- toggles don't each need a migration.

ALTER TABLE user_shops
  ADD COLUMN IF NOT EXISTS banner_height integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS card_radius integer DEFAULT 16,
  ADD COLUMN IF NOT EXISTS show_bio boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_socials boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats boolean DEFAULT true,
  -- Look of the per-shop item detail modal (button shape, accent use, etc.)
  ADD COLUMN IF NOT EXISTS detail_modal jsonb NOT NULL DEFAULT '{}'::jsonb;
