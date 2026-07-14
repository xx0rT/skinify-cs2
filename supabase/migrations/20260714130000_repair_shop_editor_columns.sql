/*
  # Repair shop-editor columns

  The advanced editor UPDATE writes font_family + card_style, but no
  migration ever added them — the whole advanced payload (including
  element_layout / custom_components) failed with 42703 and saved
  layouts were silently lost. Add everything idempotently.
*/

ALTER TABLE user_shops
  ADD COLUMN IF NOT EXISTS font_family text,
  ADD COLUMN IF NOT EXISTS card_style text,
  ADD COLUMN IF NOT EXISTS banner_height integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS card_radius integer DEFAULT 16,
  ADD COLUMN IF NOT EXISTS show_bio boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_socials boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS detail_modal jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS element_layout jsonb,
  ADD COLUMN IF NOT EXISTS custom_components jsonb;
