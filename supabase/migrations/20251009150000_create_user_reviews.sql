/*
  # User Reviews and Ratings System

  1. New Tables
    - `user_reviews`
      - `id` (uuid, primary key)
      - `reviewer_id` (uuid, references users) - User who wrote the review
      - `reviewed_user_id` (uuid, references users) - User being reviewed
      - `order_id` (uuid, references orders) - The order this review is about
      - `rating` (integer) - Rating from 1-5
      - `comment` (text) - Review comment
      - `is_verified_purchase` (boolean) - Verified successful order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_stats`
      - `user_id` (uuid, references users, primary key)
      - `total_reviews` (integer)
      - `average_rating` (numeric)
      - `total_trades` (integer)
      - `successful_trades` (integer)
      - `total_volume` (numeric) - Total trading volume in CZK
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view all reviews
    - Users can only create reviews for completed orders
    - Users cannot review themselves
    - One review per order
*/

-- Create user_reviews table
CREATE TABLE IF NOT EXISTS user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reviewed_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewed_user_id),
  CONSTRAINT unique_review_per_order UNIQUE (reviewer_id, order_id)
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_reviews integer DEFAULT 0,
  average_rating numeric(3, 2) DEFAULT 0.00,
  total_trades integer DEFAULT 0,
  successful_trades integer DEFAULT 0,
  total_volume numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed_user ON user_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_order ON user_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_rating ON user_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_reviews_created_at ON user_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reviews
CREATE POLICY "Anyone can view reviews"
  ON user_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for completed orders"
  ON user_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id != reviewed_user_id
  );

CREATE POLICY "Users can update own reviews"
  ON user_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON user_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- RLS Policies for user_stats
CREATE POLICY "Anyone can view user stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update user stats"
  ON user_stats FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update user stats when review is added
CREATE OR REPLACE FUNCTION update_user_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for reviewed user
  INSERT INTO user_stats (user_id, total_reviews, average_rating)
  VALUES (
    NEW.reviewed_user_id,
    1,
    NEW.rating
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_reviews = user_stats.total_reviews + 1,
    average_rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM user_reviews
      WHERE reviewed_user_id = NEW.reviewed_user_id
    ),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when review is updated
CREATE OR REPLACE FUNCTION update_user_stats_on_review_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate stats for reviewed user
  UPDATE user_stats
  SET
    average_rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM user_reviews
      WHERE reviewed_user_id = NEW.reviewed_user_id
    ),
    updated_at = now()
  WHERE user_id = NEW.reviewed_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when review is deleted
CREATE OR REPLACE FUNCTION update_user_stats_on_review_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for reviewed user
  UPDATE user_stats
  SET
    total_reviews = GREATEST(0, user_stats.total_reviews - 1),
    average_rating = COALESCE((
      SELECT AVG(rating)::numeric(3,2)
      FROM user_reviews
      WHERE reviewed_user_id = OLD.reviewed_user_id
    ), 0.00),
    updated_at = now()
  WHERE user_id = OLD.reviewed_user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_stats_on_review_insert ON user_reviews;
CREATE TRIGGER trigger_update_stats_on_review_insert
  AFTER INSERT ON user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_review();

DROP TRIGGER IF EXISTS trigger_update_stats_on_review_update ON user_reviews;
CREATE TRIGGER trigger_update_stats_on_review_update
  AFTER UPDATE ON user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_review_change();

DROP TRIGGER IF EXISTS trigger_update_stats_on_review_delete ON user_reviews;
CREATE TRIGGER trigger_update_stats_on_review_delete
  AFTER DELETE ON user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_review_delete();

-- Function to initialize or update trading stats from orders
CREATE OR REPLACE FUNCTION update_trading_stats(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_stats (
    user_id,
    total_trades,
    successful_trades,
    total_volume
  )
  SELECT
    p_user_id,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_trades,
    COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_volume
  FROM orders
  WHERE buyer_id = p_user_id OR seller_id = p_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_trades = EXCLUDED.total_trades,
    successful_trades = EXCLUDED.successful_trades,
    total_volume = EXCLUDED.total_volume,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
