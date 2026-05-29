/*
  # Create Blog Posts System

  1. New Tables
    - `blog_posts`
      - `id` (bigint, primary key, auto-increment)
      - `title` (text, not null) - Blog post title
      - `slug` (text, unique, not null) - URL-friendly slug
      - `excerpt` (text) - Short description/summary
      - `content` (text, not null) - Full blog post content (markdown supported)
      - `cover_image_url` (text) - Cover image URL
      - `author_id` (uuid, references auth.users) - Author
      - `author_name` (text) - Author display name
      - `category` (text) - Blog category (News, Updates, Guide, etc.)
      - `tags` (text[]) - Array of tags
      - `is_published` (boolean, default false) - Published status
      - `is_featured` (boolean, default false) - Featured on homepage
      - `views` (integer, default 0) - View count
      - `published_at` (timestamptz) - Publication date
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `blog_posts` table
    - Public can read published posts
    - Only admins can create/update/delete posts

  3. Sample Data
    - Insert 3 sample blog posts for testing
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text DEFAULT 'Admin',
  category text DEFAULT 'News',
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  views integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published posts
CREATE POLICY "Anyone can read published posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- Policy: Admins can read all posts
CREATE POLICY "Admins can read all posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_active = true
    )
  );

-- Policy: Admins can create posts
CREATE POLICY "Admins can create posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_active = true
    )
  );

-- Policy: Admins can update posts
CREATE POLICY "Admins can update posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_active = true
    )
  );

-- Policy: Admins can delete posts
CREATE POLICY "Admins can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_active = true
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- Insert sample blog posts
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, category, tags, is_published, is_featured, published_at)
VALUES 
(
  'Welcome to Our CS:GO Marketplace',
  'welcome-to-csgo-marketplace',
  'Discover the best place to buy, sell, and trade CS:GO skins with secure transactions and competitive prices.',
  '# Welcome to Our CS:GO Marketplace

We''re excited to announce the launch of our new CS:GO skin marketplace! Our platform offers a secure, fast, and user-friendly experience for all your trading needs.

## What Makes Us Different

- **Secure Transactions**: All trades are protected by our escrow system
- **Competitive Prices**: Get the best value for your skins
- **Fast Delivery**: Instant trade offers for quick transactions
- **24/7 Support**: Our team is always here to help

## Getting Started

1. Sign in with Steam
2. Browse our extensive collection
3. Add items to your cart
4. Complete your purchase securely

Join thousands of satisfied traders today!',
  'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg',
  'Admin',
  'News',
  ARRAY['announcement', 'marketplace', 'cs:go'],
  true,
  true,
  now()
),
(
  'Top 5 Most Valuable CS:GO Skins in 2025',
  'top-5-valuable-csgo-skins-2025',
  'Explore the most sought-after and expensive CS:GO skins that every collector dreams of owning.',
  '# Top 5 Most Valuable CS:GO Skins in 2025

The CS:GO skin market continues to evolve, with certain items reaching incredible valuations. Here are the top 5 most valuable skins this year.

## 1. AWP | Dragon Lore (Factory New)

The legendary Dragon Lore remains the most iconic and valuable skin in CS:GO. With its stunning golden dragon artwork, it''s a must-have for serious collectors.

**Average Price**: $15,000 - $25,000

## 2. Karambit | Crimson Web (Factory New)

This rare knife skin features the distinctive Crimson Web pattern on the popular Karambit knife. Finding one in Factory New condition is extremely rare.

**Average Price**: $12,000 - $20,000

## 3. M4A4 | Howl (Factory New)

The Howl is unique as it was removed from cases due to copyright issues, making it a contraband item that can only be traded.

**Average Price**: $8,000 - $15,000

## 4. Butterfly Knife | Fade (Factory New)

The smooth animations of the Butterfly Knife combined with the beautiful Fade pattern create one of the most desirable skins.

**Average Price**: $4,000 - $7,000

## 5. AK-47 | Fire Serpent (Factory New)

This fierce-looking AK skin is highly sought after by players and collectors alike.

**Average Price**: $3,000 - $5,000

Stay tuned for market updates and price trends!',
  'https://images.pexels.com/photos/1293269/pexels-photo-1293269.jpeg',
  'Admin',
  'Guide',
  ARRAY['skins', 'trading', 'investment', 'top-list'],
  true,
  true,
  now() - interval '2 days'
),
(
  'How to Safely Trade CS:GO Skins',
  'how-to-safely-trade-csgo-skins',
  'Learn essential tips and best practices to protect yourself from scams and ensure secure trading.',
  '# How to Safely Trade CS:GO Skins

Trading CS:GO skins can be exciting, but it''s important to stay safe and avoid scams. Follow these guidelines to protect yourself.

## Essential Safety Tips

### 1. Use Trusted Platforms

Always trade through reputable marketplaces with escrow protection. Never send items first to strangers.

### 2. Verify Trade URLs

Check that you''re on the correct website. Scammers often create fake sites with similar URLs.

### 3. Enable Steam Guard

Make sure 2-factor authentication is enabled on your Steam account for extra security.

### 4. Check Item Details

Always verify the float value, pattern, and stickers before accepting a trade. Screenshots can be faked.

### 5. Be Wary of Too-Good-To-Be-True Offers

If someone is offering way above market price or wants to trade quickly, it''s likely a scam.

## Common Scam Types to Avoid

- **Phishing Links**: Never click suspicious links claiming to be Steam
- **Middleman Scams**: Only use official marketplace middleman services
- **API Key Scams**: Never give anyone your Steam API key
- **Fake Admin Messages**: Real admins will never ask for your items

## What to Do If You''re Scammed

1. Report the scammer on Steam
2. Report to the trading platform
3. Contact Steam Support with evidence
4. Warn others in the community

Stay safe and happy trading!',
  'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg',
  'Admin',
  'Guide',
  ARRAY['safety', 'trading', 'scams', 'tutorial'],
  true,
  false,
  now() - interval '5 days'
);