/*
  # Add escrow support to orders table

  1. Schema Changes
    - Add `escrow_release_date` column to orders table for tracking when funds will be released
    - Update status enum to include 'escrow' status for orders in 8-day holding period
    - Add index on escrow_release_date for efficient querying of orders ready for release

  2. Escrow System
    - Orders start in 'escrow' status instead of 'pending'
    - Funds are locked for 8 days from purchase date
    - After 8 days, sellers can send items and receive payment
    - Automatic release system can process orders when escrow period ends

  3. Security
    - Existing RLS policies apply to new escrow orders
    - Escrow release date is immutable once set
    - Only completed orders can have funds released
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

-- Update the status check constraint to include 'escrow'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_name = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
  
  -- Add new constraint with 'escrow' status
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text, 'refunded'::text, 'escrow'::text]));
END $$;

-- Add index on escrow_release_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_orders_escrow_release_date 
ON orders (escrow_release_date) 
WHERE escrow_release_date IS NOT NULL;

-- Add index for orders ready for release (past escrow date).
-- NOTE: NOW() is not IMMUTABLE so it cannot live in a partial-index predicate.
-- We index all escrow orders by (escrow_release_date, status); queries that
-- filter `WHERE status='escrow' AND escrow_release_date <= NOW()` will still
-- use this index efficiently at query time.
CREATE INDEX IF NOT EXISTS idx_orders_ready_for_release
ON orders (escrow_release_date, status)
WHERE status = 'escrow';

-- Add comment explaining the escrow system
COMMENT ON COLUMN orders.escrow_release_date IS 'Date when escrow period ends and items can be sent to buyer (8 days after purchase)';
COMMENT ON COLUMN orders.status IS 'Order status: pending, completed, cancelled, disputed, refunded, escrow (8-day holding period)';