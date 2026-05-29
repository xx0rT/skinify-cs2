/*
  # Add Missing Columns to Orders Table

  1. Changes
    - Add `payment_status` column (pending, completed, failed, refunded)
    - Add `payment_processed_at` timestamp
    - Add `escrow_release_date` timestamp
    - Add `trade_verified` boolean
    - Add `updated_at` timestamp

  2. Notes
    - These columns are required by the orders edge function
    - Ensures proper payment tracking and escrow management
*/

-- Add payment_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;
END $$;

-- Add payment_processed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_processed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_processed_at timestamptz;
  END IF;
END $$;

-- Add escrow_release_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'escrow_release_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN escrow_release_date timestamptz;
  END IF;
END $$;

-- Add trade_verified column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'trade_verified'
  ) THEN
    ALTER TABLE orders ADD COLUMN trade_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on payment_status for performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status, created_at DESC);

-- Create index on escrow_release_date for automated escrow releases
CREATE INDEX IF NOT EXISTS idx_orders_escrow_release_date ON orders (escrow_release_date)
  WHERE payment_status = 'pending' AND status = 'pending';
