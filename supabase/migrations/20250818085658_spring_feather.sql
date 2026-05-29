/*
  # Fix Balance Trigger Naming Conflicts

  This migration fixes the ambiguous column reference error in the balance update trigger.
  
  1. **Security Changes**
     - Only completed transactions update user balance
     - Pending transactions create records but don't add money
  
  2. **Technical Fixes**
     - Use proper variable names to avoid column conflicts
     - Add table aliases for clarity
     - Explicit type casting for all numeric operations
  
  3. **Type Safety**
     - All variables declared as NUMERIC
     - Proper COALESCE with type casting
     - No mixing of incompatible types
*/

-- Drop the problematic trigger and function with CASCADE
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions CASCADE;
DROP FUNCTION IF EXISTS update_user_balance() CASCADE;

-- Create the fixed balance update function with proper naming
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
DECLARE
    user_current_balance NUMERIC := 0;
    user_deposited NUMERIC := 0;
    user_spent NUMERIC := 0;
    user_earned NUMERIC := 0;
    calculated_new_balance NUMERIC := 0;
BEGIN
    -- CRITICAL SECURITY: Only update balance for completed transactions
    IF NEW.status != 'completed' THEN
        -- For pending/failed transactions, record current balance but don't change it
        SELECT COALESCE(u.current_balance::NUMERIC, 0)
        INTO user_current_balance
        FROM users u 
        WHERE u.id = NEW.user_id;
        
        NEW.balance_before := user_current_balance;
        NEW.balance_after := user_current_balance; -- No change for non-completed
        
        RAISE NOTICE 'Pending transaction created - NO balance update: User %, Amount %, Status %', 
                     NEW.steam_id, NEW.amount, NEW.status;
        RETURN NEW;
    END IF;
    
    -- Get current user data (only for completed transactions)
    SELECT 
        COALESCE(u.current_balance::NUMERIC, 0),
        COALESCE(u.total_deposited::NUMERIC, 0),
        COALESCE(u.total_spent::NUMERIC, 0),
        COALESCE(u.total_earned::NUMERIC, 0)
    INTO 
        user_current_balance,
        user_deposited,
        user_spent,
        user_earned
    FROM users u 
    WHERE u.id = NEW.user_id;
    
    -- If user not found, initialize with zeros
    IF NOT FOUND THEN
        user_current_balance := 0;
        user_deposited := 0;
        user_spent := 0;
        user_earned := 0;
    END IF;
    
    -- Set balance_before
    NEW.balance_before := user_current_balance;
    
    -- Calculate new balance based on transaction type
    CASE NEW.type
        WHEN 'deposit' THEN
            calculated_new_balance := user_current_balance + NEW.amount;
            user_deposited := user_deposited + NEW.amount;
        WHEN 'sale' THEN
            calculated_new_balance := user_current_balance + NEW.amount;
            user_earned := user_earned + NEW.amount;
        WHEN 'purchase' THEN
            calculated_new_balance := user_current_balance - NEW.amount;
            user_spent := user_spent + NEW.amount;
        WHEN 'withdrawal' THEN
            calculated_new_balance := user_current_balance - NEW.amount;
        WHEN 'refund' THEN
            calculated_new_balance := user_current_balance + NEW.amount;
        WHEN 'admin_adjustment' THEN
            -- Admin can add or subtract (amount can be negative)
            calculated_new_balance := user_current_balance + NEW.amount;
        ELSE
            -- Unknown transaction type - no balance change
            calculated_new_balance := user_current_balance;
    END CASE;
    
    -- Ensure balance never goes negative (except for admin adjustments)
    IF NEW.type != 'admin_adjustment' AND calculated_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %, Type: %', 
                        user_current_balance, NEW.amount, NEW.type;
    END IF;
    
    -- Set balance_after
    NEW.balance_after := calculated_new_balance;
    
    -- Update user's balance and totals (only for completed transactions)
    UPDATE users 
    SET 
        current_balance = calculated_new_balance,
        total_deposited = user_deposited,
        total_spent = user_spent,
        total_earned = user_earned,
        updated_at = now()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Balance updated: User %, Type %, Amount %, New Balance %', 
                 NEW.steam_id, NEW.type, NEW.amount, calculated_new_balance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_user_balance
    BEFORE INSERT ON user_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_balance();

-- Test the function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_user_balance'
    ) THEN
        RAISE NOTICE 'SUCCESS: Balance trigger function created with proper naming and security';
    ELSE
        RAISE EXCEPTION 'FAILED: Balance trigger function was not created';
    END IF;
END $$;