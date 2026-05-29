/*
  # Create Analytics System

  1. New Tables
    - `user_activity` - Track user actions (clicks, page views)
    - `daily_stats` - Aggregated daily statistics

  2. Security
    - Enable RLS on all tables
    - Only admins can read analytics data

  3. Indexes
    - Performance indexes for date-based queries
    - User and action type indexes
*/

-- User Activity Tracking Table
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_steam_id text,
  session_id text NOT NULL,
  event_type text NOT NULL, -- 'page_view', 'click', 'deposit', 'purchase', etc.
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  page_title text,
  referrer text,
  user_agent text,
  ip_address inet,
  country_code text,
  created_at timestamptz DEFAULT now()
);

-- Daily Statistics Table (for faster querying)
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date date NOT NULL UNIQUE,
  total_visits integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  new_registrations integer DEFAULT 0,
  total_deposits numeric(12,2) DEFAULT 0,
  total_purchases numeric(12,2) DEFAULT 0,
  total_sales numeric(12,2) DEFAULT 0,
  active_users integer DEFAULT 0,
  page_views jsonb DEFAULT '{}'::jsonb, -- {"marketplace": 150, "profile": 80, ...}
  popular_items jsonb DEFAULT '{}'::jsonb, -- Top viewed items
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_session_id ON user_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event_type ON user_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date DESC);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies for user_activity
CREATE POLICY "Admins can view all activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
    OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "System can insert activity"
  ON user_activity FOR INSERT
  WITH CHECK (true);

-- Policies for daily_stats
CREATE POLICY "Admins can view daily stats"
  ON daily_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
    OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "System can manage daily stats"
  ON daily_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS trigger AS $$
BEGIN
  -- Update daily stats for today
  INSERT INTO daily_stats (stat_date, total_visits)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (stat_date)
  DO UPDATE SET
    total_visits = daily_stats.total_visits + 1,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update daily stats
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON user_activity;
CREATE TRIGGER trigger_update_daily_stats
  AFTER INSERT ON user_activity
  FOR EACH ROW
  WHEN (NEW.event_type = 'page_view')
  EXECUTE FUNCTION update_daily_stats();

-- Function to get today's stats
CREATE OR REPLACE FUNCTION get_today_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_visits', COUNT(DISTINCT session_id),
    'unique_visitors', COUNT(DISTINCT user_steam_id),
    'page_views', COUNT(*) FILTER (WHERE event_type = 'page_view'),
    'clicks', COUNT(*) FILTER (WHERE event_type = 'click'),
    'new_registrations', (
      SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE
    ),
    'deposits_today', (
      SELECT COALESCE(SUM(amount), 0)
      FROM user_balance_transactions
      WHERE transaction_type = 'deposit' AND created_at::date = CURRENT_DATE
    ),
    'purchases_today', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE created_at::date = CURRENT_DATE
    )
  ) INTO result
  FROM user_activity
  WHERE created_at::date = CURRENT_DATE;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM orders),
    'active_listings', (SELECT COUNT(*) FROM marketplace_listings WHERE is_active = true),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', created_at::date,
          'visits', COUNT(DISTINCT session_id),
          'users', COUNT(DISTINCT user_steam_id)
        )
      )
      FROM user_activity
      WHERE created_at >= CURRENT_DATE - days_back
      GROUP BY created_at::date
      ORDER BY created_at::date DESC
    )
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
