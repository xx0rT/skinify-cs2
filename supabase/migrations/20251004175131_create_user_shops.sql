/*
  # User Shops System

  1. Purpose
    - Allow users to create and customize their own marketplace shops
    - Enable shop branding, customization, and unique URLs
    - Track shop items, views, and sales

  2. Tables Created
    - `user_shops` - Main shop information and settings
    - `shop_items` - Items listed in user shops
    - `shop_views` - Track shop visits and analytics
    - `shop_themes` - Custom themes and designs

  3. Features
    - Custom shop URL (username-based)
    - Shop branding (logo, banner, colors)
    - Shop description and social links
    - Featured items
    - Shop analytics (views, sales)
    - Custom themes and layouts

  4. Security
    - Users can only manage their own shops
    - Public can view active shops
    - Shop owners can manage their listings
*/

-- ============================================
-- 1. USER SHOPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  shop_url text UNIQUE NOT NULL,
  description text,
  logo_url text,
  banner_url text,

  -- Branding
  primary_color text DEFAULT '#3B82F6',
  secondary_color text DEFAULT '#8B5CF6',
  accent_color text DEFAULT '#10B981',

  -- Layout settings
  layout_style text DEFAULT 'grid' CHECK (layout_style IN ('grid', 'list', 'masonry')),
  items_per_page integer DEFAULT 12,
  show_categories boolean DEFAULT true,
  show_filters boolean DEFAULT true,

  -- Contact & Social
  email text,
  discord_username text,
  twitter_url text,
  instagram_url text,
  youtube_url text,

  -- Settings
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  allow_offers boolean DEFAULT true,
  auto_accept_offers boolean DEFAULT false,

  -- Analytics
  total_views integer DEFAULT 0,
  total_sales integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_shops_user_id ON user_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_shop_url ON user_shops(shop_url);
CREATE INDEX IF NOT EXISTS idx_user_shops_is_active ON user_shops(is_active);
CREATE INDEX IF NOT EXISTS idx_user_shops_featured ON user_shops(featured);

ALTER TABLE user_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active shops"
  ON user_shops FOR SELECT
  USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own shop"
  ON user_shops FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shop"
  ON user_shops FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own shop"
  ON user_shops FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================
-- 2. SHOP ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES user_shops(id) ON DELETE CASCADE,
  listing_id bigint REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  -- Display settings
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  custom_description text,

  -- Pricing
  original_price numeric(10,2),
  discount_percentage numeric(5,2),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_items_shop_id ON shop_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_listing_id ON shop_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_featured ON shop_items(is_featured);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop items"
  ON shop_items FOR SELECT
  USING (true);

CREATE POLICY "Shop owners can manage their items"
  ON shop_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_shops
      WHERE user_shops.id = shop_items.shop_id
      AND user_shops.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_shops
      WHERE user_shops.id = shop_items.shop_id
      AND user_shops.user_id = auth.uid()
    )
  );


-- ============================================
-- 3. SHOP VIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES user_shops(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  referrer text,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_views_shop_id ON shop_views(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_views_viewer_id ON shop_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_shop_views_viewed_at ON shop_views(viewed_at DESC);

ALTER TABLE shop_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their analytics"
  ON shop_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_shops
      WHERE user_shops.id = shop_views.shop_id
      AND user_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert views"
  ON shop_views FOR INSERT
  WITH CHECK (true);


-- ============================================
-- 4. SHOP THEMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES user_shops(id) ON DELETE CASCADE,
  theme_name text NOT NULL,

  -- Theme configuration
  config jsonb DEFAULT '{}'::jsonb,

  -- Custom CSS
  custom_css text,

  -- Layout settings
  header_style text DEFAULT 'default',
  footer_style text DEFAULT 'default',
  card_style text DEFAULT 'default',

  -- Typography
  font_family text DEFAULT 'Inter',
  heading_font text DEFAULT 'Poppins',

  -- Effects
  animations_enabled boolean DEFAULT true,
  hover_effects boolean DEFAULT true,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(shop_id, theme_name)
);

CREATE INDEX IF NOT EXISTS idx_shop_themes_shop_id ON shop_themes(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_themes_is_active ON shop_themes(is_active);

ALTER TABLE shop_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can manage their themes"
  ON shop_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_shops
      WHERE user_shops.id = shop_themes.shop_id
      AND user_shops.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_shops
      WHERE user_shops.id = shop_themes.shop_id
      AND user_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active themes"
  ON shop_themes FOR SELECT
  USING (is_active = true);


-- ============================================
-- 5. SHOP ANALYTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW shop_analytics AS
SELECT
  us.id as shop_id,
  us.shop_name,
  us.shop_url,
  us.user_id,
  us.total_views,
  us.total_sales,
  us.total_revenue,
  COUNT(DISTINCT sv.id) as views_last_30_days,
  COUNT(DISTINCT CASE WHEN sv.viewed_at >= NOW() - INTERVAL '7 days' THEN sv.id END) as views_last_7_days,
  COUNT(DISTINCT si.id) as total_items,
  COUNT(DISTINCT CASE WHEN si.is_featured THEN si.id END) as featured_items
FROM user_shops us
LEFT JOIN shop_views sv ON sv.shop_id = us.id AND sv.viewed_at >= NOW() - INTERVAL '30 days'
LEFT JOIN shop_items si ON si.shop_id = us.id
GROUP BY us.id;


-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Function to increment shop views
CREATE OR REPLACE FUNCTION increment_shop_views(shop_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_shops
  SET total_views = total_views + 1,
      updated_at = now()
  WHERE id = shop_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique shop URL
CREATE OR REPLACE FUNCTION generate_shop_url(username text)
RETURNS text AS $$
DECLARE
  base_url text;
  final_url text;
  counter integer := 0;
BEGIN
  -- Sanitize username: lowercase, replace spaces/special chars with hyphens
  base_url := lower(regexp_replace(username, '[^a-zA-Z0-9]', '-', 'g'));
  base_url := regexp_replace(base_url, '-+', '-', 'g');
  base_url := trim(both '-' from base_url);

  final_url := base_url;

  -- Check if URL exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM user_shops WHERE shop_url = final_url) LOOP
    counter := counter + 1;
    final_url := base_url || '-' || counter;
  END LOOP;

  RETURN final_url;
END;
$$ LANGUAGE plpgsql;
