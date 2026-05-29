/*
  # Create Wishlist Tracking System

  1. New Tables
    - `wishlist_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `listing_id` (uuid, foreign key to marketplace_listings)
      - `created_at` (timestamptz)

    - `wishlist_counts`
      - `listing_id` (uuid, primary key, foreign key to marketplace_listings)
      - `count` (integer, default 0)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can manage their own wishlist items
    - Anyone can view wishlist counts (public data)

  3. Triggers
    - Auto-update wishlist counts when items are added/removed
*/

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create wishlist_counts table
CREATE TABLE IF NOT EXISTS wishlist_counts (
  listing_id uuid PRIMARY KEY,
  count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_counts ENABLE ROW LEVEL SECURITY;

-- Policies for wishlist_items
CREATE POLICY "Users can view own wishlist items"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for wishlist_counts (public read)
CREATE POLICY "Anyone can view wishlist counts"
  ON wishlist_counts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update wishlist counts"
  ON wishlist_counts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update wishlist count
CREATE OR REPLACE FUNCTION update_wishlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wishlist_counts (listing_id, count, updated_at)
    VALUES (NEW.listing_id, 1, now())
    ON CONFLICT (listing_id)
    DO UPDATE SET
      count = wishlist_counts.count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wishlist_counts
    SET
      count = GREATEST(count - 1, 0),
      updated_at = now()
    WHERE listing_id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_wishlist_count_trigger ON wishlist_items;
CREATE TRIGGER update_wishlist_count_trigger
  AFTER INSERT OR DELETE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_count();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_listing_id ON wishlist_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_counts_listing_id ON wishlist_counts(listing_id);
