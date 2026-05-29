/*
  # CSS Styling Presets System

  1. New Tables
    - `css_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users) - Creator of the preset
      - `name` (text) - Preset name
      - `description` (text) - Description of the preset
      - `css_code` (text) - The custom CSS code
      - `preview_image_url` (text) - Optional preview image URL
      - `is_public` (boolean) - Whether preset is publicly shared
      - `download_count` (integer) - Number of times downloaded
      - `like_count` (integer) - Number of likes
      - `category` (text) - Category (dark, light, colorful, minimal, etc.)
      - `tags` (text[]) - Array of tags for searching
      - `version` (text) - Version number (e.g., "1.0.0")
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `css_preset_likes`
      - `id` (uuid, primary key)
      - `preset_id` (uuid, references css_presets)
      - `user_id` (uuid, references users)
      - `created_at` (timestamptz)

    - `css_preset_downloads`
      - `id` (uuid, primary key)
      - `preset_id` (uuid, references css_presets)
      - `user_id` (uuid, references users)
      - `downloaded_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Anyone can view public presets
    - Only creators can edit their own presets
    - Track downloads and likes
*/

-- Create css_presets table
CREATE TABLE IF NOT EXISTS css_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  description text CHECK (length(description) <= 500),
  css_code text NOT NULL CHECK (length(css_code) <= 50000),
  preview_image_url text,
  is_public boolean DEFAULT false,
  download_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  category text DEFAULT 'other' CHECK (category IN ('dark', 'light', 'colorful', 'minimal', 'gaming', 'professional', 'other')),
  tags text[] DEFAULT ARRAY[]::text[],
  version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create css_preset_likes table
CREATE TABLE IF NOT EXISTS css_preset_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid REFERENCES css_presets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_preset_like UNIQUE (preset_id, user_id)
);

-- Create css_preset_downloads table
CREATE TABLE IF NOT EXISTS css_preset_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid REFERENCES css_presets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  downloaded_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_css_presets_user_id ON css_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_css_presets_is_public ON css_presets(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_css_presets_category ON css_presets(category);
CREATE INDEX IF NOT EXISTS idx_css_presets_download_count ON css_presets(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_css_presets_like_count ON css_presets(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_css_presets_created_at ON css_presets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_css_preset_likes_preset ON css_preset_likes(preset_id);
CREATE INDEX IF NOT EXISTS idx_css_preset_likes_user ON css_preset_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_css_preset_downloads_preset ON css_preset_downloads(preset_id);

-- Enable RLS
ALTER TABLE css_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE css_preset_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE css_preset_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for css_presets
CREATE POLICY "Anyone can view public presets"
  ON css_presets FOR SELECT
  USING (is_public = true OR user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Service role can view all presets"
  ON css_presets FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Users can create own presets"
  ON css_presets FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Users can update own presets"
  ON css_presets FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Users can delete own presets"
  ON css_presets FOR DELETE
  USING (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Service role can manage all presets"
  ON css_presets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for css_preset_likes
CREATE POLICY "Anyone can view likes"
  ON css_preset_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like presets"
  ON css_preset_likes FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Users can unlike presets"
  ON css_preset_likes FOR DELETE
  USING (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Service role can manage likes"
  ON css_preset_likes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for css_preset_downloads
CREATE POLICY "Users can view own downloads"
  ON css_preset_downloads FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Users can record downloads"
  ON css_preset_downloads FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE steam_id = current_setting('app.current_user_steam_id', true)
  ));

CREATE POLICY "Service role can view all downloads"
  ON css_preset_downloads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update like count when like is added/removed
CREATE OR REPLACE FUNCTION update_preset_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE css_presets
    SET like_count = like_count + 1
    WHERE id = NEW.preset_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE css_presets
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.preset_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update download count
CREATE OR REPLACE FUNCTION update_preset_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE css_presets
  SET download_count = download_count + 1
  WHERE id = NEW.preset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_preset_like_count ON css_preset_likes;
CREATE TRIGGER trigger_update_preset_like_count
  AFTER INSERT OR DELETE ON css_preset_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_preset_like_count();

DROP TRIGGER IF EXISTS trigger_update_preset_download_count ON css_preset_downloads;
CREATE TRIGGER trigger_update_preset_download_count
  AFTER INSERT ON css_preset_downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_preset_download_count();

-- Insert some default presets
DO $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Get or create system user for default presets
  SELECT id INTO system_user_id FROM users WHERE steam_id = 'system' LIMIT 1;

  IF system_user_id IS NULL THEN
    INSERT INTO users (steam_id, display_name, avatar_url)
    VALUES ('system', 'System', 'https://via.placeholder.com/150')
    RETURNING id INTO system_user_id;
  END IF;

  -- Insert default dark theme preset
  INSERT INTO css_presets (user_id, name, description, css_code, is_public, category, tags)
  VALUES (
    system_user_id,
    'Dark Elite',
    'Professional dark theme with subtle purple accents and smooth animations',
    '/* Dark Elite Theme */
.marketplace-item {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(168, 85, 247, 0.2);
  transition: all 0.3s ease;
}
.marketplace-item:hover {
  transform: translateY(-5px);
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 10px 30px rgba(168, 85, 247, 0.3);
}
.item-name {
  color: #fff;
  font-weight: 600;
}
.item-price {
  color: #a855f7;
  font-size: 1.25rem;
  font-weight: 700;
}',
    true,
    'dark',
    ARRAY['professional', 'purple', 'smooth']
  ) ON CONFLICT DO NOTHING;

  -- Insert light theme preset
  INSERT INTO css_presets (user_id, name, description, css_code, is_public, category, tags)
  VALUES (
    system_user_id,
    'Light Breeze',
    'Clean and minimal light theme perfect for daytime browsing',
    '/* Light Breeze Theme */
.marketplace-item {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}
.marketplace-item:hover {
  transform: scale(1.02);
  border-color: #a855f7;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}
.item-name {
  color: #1a1a1a;
  font-weight: 600;
}
.item-price {
  color: #8b5cf6;
  font-size: 1.25rem;
  font-weight: 700;
}',
    true,
    'light',
    ARRAY['minimal', 'clean', 'modern']
  ) ON CONFLICT DO NOTHING;

  -- Insert gaming theme preset
  INSERT INTO css_presets (user_id, name, description, css_code, is_public, category, tags)
  VALUES (
    system_user_id,
    'Neon Gamer',
    'Vibrant neon colors with gaming-style effects and animations',
    '/* Neon Gamer Theme */
.marketplace-item {
  background: rgba(20, 20, 40, 0.9);
  border: 2px solid #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
}
.marketplace-item:hover {
  transform: translateY(-8px) rotateZ(1deg);
  border-color: #ff00ff;
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.6), 0 0 50px rgba(0, 255, 255, 0.3);
}
.item-name {
  color: #00ffff;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}
.item-price {
  color: #ff00ff;
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
}',
    true,
    'gaming',
    ARRAY['neon', 'colorful', 'vibrant', 'cyberpunk']
  ) ON CONFLICT DO NOTHING;
END $$;
