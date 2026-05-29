/*
  # Add pending balance to users table

  1. New Columns
    - `pending_balance` (numeric) - Funds locked in 8-day escrow after Steam trade completion
  
  2. Updates
    - Add index for pending balance queries
    - Update existing users to have 0 pending balance by default
  
  3. Purpose
    - Track funds in 8-day escrow after successful Steam trades
    - Separate from available balance until escrow period ends
*/

-- Add pending balance column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN pending_balance numeric DEFAULT 0;
    COMMENT ON COLUMN users.pending_balance IS 'Funds locked in 8-day escrow after Steam trade completion';
  END IF;
END $$;

-- Add index for pending balance queries
CREATE INDEX IF NOT EXISTS idx_users_pending_balance ON users (pending_balance);

-- Update existing users to have 0 pending balance
UPDATE users SET pending_balance = 0 WHERE pending_balance IS NULL;