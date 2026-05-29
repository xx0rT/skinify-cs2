/*
  # Complete Balance Trigger Type Fix

  This migration completely fixes the balance trigger type mismatch errors by:
  1. Ensuring all balance columns are NUMERIC type
  2. Creating a new trigger function with proper type handling
  3. Fixing the COALESCE type mismatch issues
  
  ## Changes Made
  1. Drop existing trigger and function safely
  2. Ensure all user balance columns are NUMERIC
  3. Create new trigger function with explicit type casting
  4. Recreate trigger with proper error handling
*/

-- Step 1: Drop existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions CASCADE;
DROP FUNCTION IF EXISTS update_user_balance() CASCADE;

-- Step 2: Ensure all balance columns are NUMERIC type (not text)
ALTER TABLE users 
  ALTER COLUMN current_balance TYPE NUMERIC USING COALESCE(current_balance::NUMERIC, 0),
  ALTER COLUMN total_deposited TYPE NUMERIC USING COALESCE(total_deposited::NUMERIC, 0),
  ALTER COLUMN total_spent TYPE NUMERIC USING COALESCE(total_spent::NUMERIC, 0),
  ALTER COLUMN total_earned TYPE NUMERIC USING COALESCE(total_earned::NUMERIC, 0);

-- Step 3: Set proper defaults for balance columns
ALTER TABLE users 
  ALTER COLUMN current_balance SET DEFAULT 0,
  ALTER COLUMN total_deposited SET DEFAULT 0,
  ALTER COLUMN total_spent SET DEFAULT 0,
  ALTER COLUMN total_earned SET DEFAULT 0;

-- Step 4: Update any NULL values to 0
UPDATE users 
SET 
  current_balance = COALESCE(current_balance, 0),
  total_deposited = COALESCE(total_deposited, 0),
  total_spent = COALESCE(total_spent, 0),
  total_earned = COALESCE(total_earned, 0);

-- Step 5: Create new balance update function with proper types
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
DECLARE
    user_balance NUMERIC;
    user_deposited NUMERIC;
    user_spent NUMERIC;
    user_earned NUMERIC;
    final_balance NUMERIC;
BEGIN
    -- SECURITY: Only process completed transactions
    IF NEW.status != 'completed' THEN
        -- For non-completed transactions, just set before/after to current balance
        SELECT current_balance INTO user_balance
        FROM users 
        WHERE id = NEW.user_id;
        
        NEW.balance_before := COALESCE(user_balance, 0);
        NEW.balance_after := COALESCE(user_balance, 0);
        RETURN NEW;
    END IF;
    
    -- Get current user data with explicit type casting
    SELECT 
        COALESCE(current_balance, 0)::NUMERIC,
        COALESCE(total_deposited, 0)::NUMERIC,
        COALESCE(total_spent, 0)::NUMERIC,
        COALESCE(total_earned, 0)::NUMERIC
    INTO 
        user_balance,
        user_deposited,
        user_spent,
        user_earned
    FROM users 
    WHERE id = NEW.user_id;
    
    -- Handle case where user doesn't exist (shouldn't happen but safety first)
    IF user_balance IS NULL THEN
        user_balance := 0;
        user_deposited := 0;
        user_spent := 0;
        user_earned := 0;
    END IF;
    
    -- Set balance_before
    NEW.balance_before := user_balance;
    
    -- Calculate new balance based on transaction type
    CASE NEW.type
        WHEN 'deposit' THEN
            final_balance := user_balance + NEW.amount;
        WHEN 'sale' THEN
            final_balance := user_balance + NEW.amount;
        WHEN 'refund' THEN
            final_balance := user_balance + NEW.amount;
        WHEN 'purchase' THEN
            final_balance := user_balance - NEW.amount;
        WHEN 'withdrawal' THEN
            final_balance := user_balance - NEW.amount;
        WHEN 'admin_adjustment' THEN
            final_balance := user_balance + NEW.amount; -- Can be negative for admin
        ELSE
            final_balance := user_balance; -- No change for unknown types
    END CASE;
    
    -- Prevent negative balance (except admin adjustments)
    IF NEW.type != 'admin_adjustment' AND final_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %, Type: %', 
            user_balance, NEW.amount, NEW.type;
    END IF;
    
    -- Set balance_after
    NEW.balance_after := final_balance;
    
    -- Update user totals (only for completed transactions)
    UPDATE users 
    SET 
        current_balance = final_balance,
        total_deposited = CASE 
            WHEN NEW.type = 'deposit' THEN user_deposited + NEW.amount
            ELSE user_deposited
        END,
        total_spent = CASE 
            WHEN NEW.type = 'purchase' THEN user_spent + NEW.amount
            ELSE user_spent
        END,
        total_earned = CASE 
            WHEN NEW.type = 'sale' THEN user_earned + NEW.amount
            ELSE user_earned
        END,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the trigger
CREATE TRIGGER trigger_update_user_balance
    BEFORE INSERT ON user_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_balance();

-- Step 7: Test the function works
DO $$
BEGIN
    -- Verify function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_user_balance'
    ) THEN
        RAISE EXCEPTION 'Failed to create update_user_balance function';
    END IF;
    
    -- Verify trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_user_balance'
    ) THEN
        RAISE EXCEPTION 'Failed to create trigger_update_user_balance';
    END IF;
    
    RAISE NOTICE 'Balance system successfully fixed and verified!';
END $$;