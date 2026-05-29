/*
  # Add Escrow Support to Orders Table

  1. Schema Updates
    - Add `escrow_release_date` column to orders table for 8-day holding period
    - Update order status enum to include 'escrow' status
    - Add index for efficient escrow release queries

  2. Escrow Features
    - Orders start in 'escrow' status with 8-day holding period
    - Funds are locked until escrow release date
    - Sellers notified but cannot send items until escrow expires
    - Automatic release system for processing escrow completions

  3. Security Enhancements
    - Anti-fraud protection through escrow holding period
    - Prevents chargeback issues
    - Gives time for payment verification
*/

-- Add escrow_release_date column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'escrow_release_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN escrow_release_date timestamptz;
  END IF;
END $$;

-- Update order status constraint to include 'escrow'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'escrow'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text, 'refunded'::text]));

-- Add index for escrow release date queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_release ON orders (escrow_release_date) WHERE status = 'escrow';

-- Add index for status and creation date
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);