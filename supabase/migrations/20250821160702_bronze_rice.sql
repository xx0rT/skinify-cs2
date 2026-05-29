/*
  # Add pending balance system for escrow funds

  1. Database Changes
    - Add `pending_balance` column to users table
    - Add `escrow_timer_started_at` column to orders table
    - Add `steam_trade_url` column to orders table
    - Update order status constraints

  2. Security
    - Maintain existing RLS policies
    - Add indexes for escrow timer queries
*/

-- Add pending balance column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN pending_balance numeric DEFAULT 0;
  END IF;
END $$;

-- Add escrow timer columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'escrow_timer_started_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN escrow_timer_started_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'steam_trade_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN steam_trade_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'trade_offer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN trade_offer_id text;
  END IF;
END $$;

-- Create index for pending balance
CREATE INDEX IF NOT EXISTS idx_users_pending_balance ON users (pending_balance);

-- Create index for escrow timer queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_timer ON orders (escrow_timer_started_at, status);

-- Add comment explaining the pending balance system
COMMENT ON COLUMN users.pending_balance IS 'Funds locked in 8-day escrow after Steam trade completion';
COMMENT ON COLUMN orders.escrow_timer_started_at IS 'Timestamp when 8-day escrow timer started (after Steam trade completion)';
COMMENT ON COLUMN orders.steam_trade_url IS 'Steam trade URL for seller to send items to buyer';
COMMENT ON COLUMN orders.trade_offer_id IS 'Steam trade offer ID for tracking completion';