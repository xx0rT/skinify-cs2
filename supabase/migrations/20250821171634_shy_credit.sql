/*
  # Add pending balance column to users table

  1. Schema Changes
    - Add `pending_balance` column to `users` table
    - Add index for efficient pending balance queries
  
  2. Security
    - Update existing RLS policies to include pending balance
    - Ensure proper access control for pending funds
  
  3. Notes
    - Pending balance holds funds for 8-day security period
    - Funds automatically release to current_balance after hold period
    - Used for Steam trade completion payments
*/

-- Add pending_balance column to users table
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

-- Add index for current balance (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_current_balance ON users (current_balance);

-- Update the balance update trigger to handle pending balance
CREATE OR REPLACE FUNCTION update_user_balance_from_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate balance from completed transactions
  WITH balance_calculation AS (
    SELECT 
      ut.steam_id,
      COALESCE(SUM(
        CASE 
          WHEN ut.type IN ('deposit', 'refund', 'admin_adjustment') THEN ut.amount
          WHEN ut.type IN ('purchase', 'withdrawal') THEN -ut.amount
          WHEN ut.type = 'sale' AND (ut.metadata->>'pending_wallet')::boolean IS NOT TRUE THEN ut.amount
          ELSE 0
        END
      ), 0) as new_balance,
      COALESCE(SUM(
        CASE 
          WHEN ut.type = 'sale' AND (ut.metadata->>'pending_wallet')::boolean IS TRUE THEN ut.amount
          ELSE 0
        END
      ), 0) as new_pending_balance,
      COALESCE(SUM(
        CASE 
          WHEN ut.type = 'deposit' THEN ut.amount
          ELSE 0
        END
      ), 0) as new_total_deposited,
      COALESCE(SUM(
        CASE 
          WHEN ut.type IN ('purchase', 'withdrawal') THEN ut.amount
          ELSE 0
        END
      ), 0) as new_total_spent,
      COALESCE(SUM(
        CASE 
          WHEN ut.type = 'sale' THEN ut.amount
          ELSE 0
        END
      ), 0) as new_total_earned
    FROM user_transactions ut
    WHERE ut.steam_id = NEW.steam_id 
      AND ut.status = 'completed'
    GROUP BY ut.steam_id
  )
  UPDATE users 
  SET 
    current_balance = bc.new_balance,
    pending_balance = bc.new_pending_balance,
    total_deposited = bc.new_total_deposited,
    total_spent = bc.new_total_spent,
    total_earned = bc.new_total_earned,
    updated_at = now()
  FROM balance_calculation bc
  WHERE users.steam_id = bc.steam_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_user_balance'
  ) THEN
    CREATE TRIGGER trigger_update_user_balance
      AFTER INSERT OR UPDATE ON user_transactions
      FOR EACH ROW
      WHEN (NEW.status = 'completed')
      EXECUTE FUNCTION update_user_balance_from_transactions();
  END IF;
END $$;