/*
  # Fix Withdrawal Balance Bug

  1. Problem
    - When users withdraw funds, the amount is being ADDED instead of SUBTRACTED
    - The trigger function recalculates balance from ALL transactions
    - Withdrawals should decrease the balance but they're increasing it

  2. Root Cause
    - The trigger expects ALL amounts to be stored as POSITIVE values
    - Then it negates them for purchases/withdrawals: -ut.amount
    - This works IF amounts are always positive in the database

  3. Solution
    - Ensure withdrawal amounts are stored as POSITIVE values
    - The trigger will correctly negate them when calculating balance
    - Add validation to prevent negative amounts in transactions

  4. Security
    - Validate all transaction amounts are positive before insertion
    - Prevent manipulation of balance through negative amounts
*/

-- Drop existing trigger to recreate it with better logic
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions;

-- Create improved balance update function with validation
CREATE OR REPLACE FUNCTION update_user_balance_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
BEGIN
  -- CRITICAL VALIDATION: Ensure amount is always positive
  IF NEW.amount < 0 THEN
    RAISE EXCEPTION 'Transaction amount must be positive. Got: %. Type: %', NEW.amount, NEW.type;
  END IF;

  -- Only process completed transactions
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get current balance before update
  SELECT current_balance INTO v_old_balance
  FROM users
  WHERE steam_id = NEW.steam_id;

  -- Calculate balance from completed transactions
  WITH balance_calculation AS (
    SELECT
      ut.steam_id,
      COALESCE(SUM(
        CASE
          -- ADD money for these transaction types
          WHEN ut.type IN ('deposit', 'refund', 'admin_adjustment') THEN ut.amount
          -- SUBTRACT money for these transaction types
          WHEN ut.type IN ('purchase', 'withdrawal') THEN -ut.amount
          -- Handle sales (with pending wallet logic)
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
    current_balance = GREATEST(0, bc.new_balance), -- Prevent negative balance
    pending_balance = bc.new_pending_balance,
    total_deposited = bc.new_total_deposited,
    total_spent = bc.new_total_spent,
    total_earned = bc.new_total_earned,
    updated_at = now()
  FROM balance_calculation bc
  WHERE users.steam_id = bc.steam_id;

  -- Get new balance after update
  SELECT current_balance INTO v_new_balance
  FROM users
  WHERE steam_id = NEW.steam_id;

  -- Log balance change for debugging
  RAISE NOTICE 'Balance Update - User: % | Type: % | Amount: % | Old Balance: % | New Balance: %',
    NEW.steam_id, NEW.type, NEW.amount, v_old_balance, v_new_balance;

  -- Additional validation for withdrawals
  IF NEW.type = 'withdrawal' AND v_new_balance >= v_old_balance THEN
    RAISE WARNING 'BALANCE BUG DETECTED - Withdrawal increased balance! User: % | Old: % | New: % | Amount: %',
      NEW.steam_id, v_old_balance, v_new_balance, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_user_balance
  AFTER INSERT OR UPDATE ON user_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_user_balance_from_transactions();

-- First, fix any existing negative amounts in the database
UPDATE user_transactions
SET amount = ABS(amount)
WHERE amount < 0;

-- Log how many rows were fixed
DO $$
DECLARE
  v_fixed_count integer;
BEGIN
  SELECT COUNT(*) INTO v_fixed_count
  FROM user_transactions
  WHERE amount < 0;

  RAISE NOTICE 'Fixed % rows with negative amounts', v_fixed_count;
END $$;

-- Now add check constraint to ensure all future amounts are positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_transactions_amount_positive'
  ) THEN
    ALTER TABLE user_transactions
    ADD CONSTRAINT user_transactions_amount_positive
    CHECK (amount > 0);
  END IF;
END $$;

COMMENT ON CONSTRAINT user_transactions_amount_positive ON user_transactions IS
  'Ensures all transaction amounts are positive. Withdrawal/purchase logic is handled in the trigger.';

-- Recalculate all user balances after fixing negative amounts
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT DISTINCT steam_id FROM user_transactions
  LOOP
    UPDATE users
    SET
      current_balance = (
        SELECT COALESCE(SUM(
          CASE
            WHEN ut.type IN ('deposit', 'refund', 'admin_adjustment') THEN ut.amount
            WHEN ut.type IN ('purchase', 'withdrawal') THEN -ut.amount
            WHEN ut.type = 'sale' AND (ut.metadata->>'pending_wallet')::boolean IS NOT TRUE THEN ut.amount
            ELSE 0
          END
        ), 0)
        FROM user_transactions ut
        WHERE ut.steam_id = v_user.steam_id
          AND ut.status = 'completed'
      ),
      pending_balance = (
        SELECT COALESCE(SUM(
          CASE
            WHEN ut.type = 'sale' AND (ut.metadata->>'pending_wallet')::boolean IS TRUE THEN ut.amount
            ELSE 0
          END
        ), 0)
        FROM user_transactions ut
        WHERE ut.steam_id = v_user.steam_id
          AND ut.status = 'completed'
      ),
      updated_at = now()
    WHERE steam_id = v_user.steam_id;
  END LOOP;

  RAISE NOTICE 'Recalculated balances for all users';
END $$;
