/*
  # Create Orders and Notifications System

  1. New Tables
    - `orders`
      - `id` (bigint, primary key)
      - `buyer_steam_id` (text)
      - `seller_steam_id` (text)
      - `transaction_id` (text, unique)
      - `items` (jsonb array of purchased items)
      - `total_amount` (numeric)
      - `status` (text: pending, completed, cancelled, disputed)
      - `payment_method` (text)
      - `created_at` (timestamp)
      - `completed_at` (timestamp)
      - `tracking_notes` (text)
    - `user_notifications`
      - `id` (bigint, primary key)
      - `user_steam_id` (text)
      - `type` (text)
      - `title` (text)
      - `message` (text)
      - `read` (boolean)
      - `action_url` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their own data
    - Add policies for order tracking and notifications

  3. Indexes
    - Performance indexes for common queries
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  buyer_steam_id text NOT NULL,
  seller_steam_id text NOT NULL,
  transaction_id text UNIQUE NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'disputed', 'refunded')),
  payment_method text NOT NULL DEFAULT 'balance',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  tracking_notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create user notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_steam_id text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'trade', 'price_alert', 'order')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_steam_id ON orders (buyer_steam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_steam_id ON orders (seller_steam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders (transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_steam_id ON user_notifications (user_steam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications (user_steam_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON user_notifications (user_steam_id, type, created_at DESC);

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders as buyer"
  ON orders
  FOR SELECT
  TO authenticated, anon
  USING (buyer_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Users can view their own orders as seller"
  ON orders
  FOR SELECT
  TO authenticated, anon
  USING (seller_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Service role can manage all orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON user_notifications
  FOR SELECT
  TO authenticated, anon
  USING (user_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Users can update their own notifications"
  ON user_notifications
  FOR UPDATE
  TO authenticated, anon
  USING (user_steam_id = current_setting('app.current_user_steam_id', true))
  WITH CHECK (user_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Service role can manage all notifications"
  ON user_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);