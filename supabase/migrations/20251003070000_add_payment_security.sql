/*
  # Add Payment and Trade Verification Security Fields

  1. Schema Changes
    - Add `payment_status` column to orders table
      - Values: 'pending', 'completed', 'failed', 'refunded'
      - Tracks if seller has been paid to prevent double payments
    - Add `trade_verified` column to orders table
      - Boolean flag indicating if Steam trade was verified
    - Add `payment_processed_at` timestamp
    - Add `items_sent_at` timestamp for tracking trade initiation

  2. Purpose
    - Prevent double payment vulnerabilities
    - Track order lifecycle accurately
    - Enable verification before payment release

  3. Security
    - Add check constraint for payment_status values
    - Default payment_status to 'pending'
    - Create index for efficient payment status queries

  4. Important Notes
    - This migration adds critical security fields
    - All payment logic should check payment_status before processing
    - Only one payment should ever be made per order
*/

-- Add payment_status column to track if seller has been paid
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add trade verification column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS trade_verified boolean DEFAULT false;

-- Add payment processed timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_processed_at timestamptz;

-- Add items sent timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_sent_at timestamptz;

-- Drop existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
END $$;

-- Add check constraint for payment_status
ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

-- Create indexes for payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_trade_verified ON orders (trade_verified);
CREATE INDEX IF NOT EXISTS idx_orders_payment_processed ON orders (payment_processed_at);

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_status IS 'Tracks if seller has been paid: pending, completed, failed, refunded. Prevents double payments.';
COMMENT ON COLUMN orders.trade_verified IS 'Boolean flag indicating if Steam trade was actually verified via Steam API';
COMMENT ON COLUMN orders.payment_processed_at IS 'Timestamp when seller payment was processed';
COMMENT ON COLUMN orders.items_sent_at IS 'Timestamp when seller initiated Steam trade';
