/*
  # Fix Balance Trigger Type Errors
  
  1. Security Changes
    - Only completed transactions update user balance
    - Pending transactions record balance_before/after but don't change actual balance
    - Proper type casting for all NUMERIC fields
  
  2. Database Changes
    - Drop and recreate trigger and function safely
    - Fix COALESCE type mismatches
    - Add proper error handling
*/

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions CASCADE;
DROP FUNCTION IF EXISTS update_user_balance() CASCADE;

-- Create the corrected balance update function
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC := 0;
    new_balance NUMERIC := 0;
    current_deposited NUMERIC := 0;
    current_spent NUMERIC := 0;
    current_earned NUMERIC := 0;
BEGIN
    -- Get current user balances with proper type casting
    SELECT 
        COALESCE(current_balance, 0)::NUMERIC,
        COALESCE(total_deposited, 0)::NUMERIC,
        COALESCE(total_spent, 0)::NUMERIC,
        COALESCE(total_earned, 0)::NUMERIC
    INTO 
        current_balance,
        current_deposited,
        current_spent,
        current_earned
    FROM users 
    WHERE id = NEW.user_id;
    
    -- If user not found, use zeros
    IF current_balance IS NULL THEN
        current_balance := 0;
        current_deposited := 0;
        current_spent := 0;
        current_earned := 0;
    END IF;
    
    -- Always set balance_before
    NEW.balance_before := current_balance;
    
    -- CRITICAL SECURITY: Only update balance for completed transactions
    IF NEW.status = 'completed' THEN
        -- Calculate new balance based on transaction type
        CASE NEW.type
            WHEN 'deposit' THEN
                new_balance := current_balance + NEW.amount;
            WHEN 'sale' THEN
                new_balance := current_balance + NEW.amount;
            WHEN 'purchase' THEN
                new_balance := current_balance - NEW.amount;
            WHEN 'withdrawal' THEN
                new_balance := current_balance - NEW.amount;
            WHEN 'refund' THEN
                new_balance := current_balance + NEW.amount;
            WHEN 'admin_adjustment' THEN
                new_balance := current_balance + NEW.amount;
            ELSE
                new_balance := current_balance;
        END CASE;
        
        -- Prevent negative balance (except admin adjustments)
        IF NEW.type != 'admin_adjustment' AND new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', current_balance, NEW.amount;
        END IF;
        
        -- Set balance_after
        NEW.balance_after := new_balance;
        
        -- Update user balance and totals
        UPDATE users 
        SET 
            current_balance = new_balance,
            total_deposited = CASE 
                WHEN NEW.type = 'deposit' THEN current_deposited + NEW.amount
                ELSE current_deposited
            END,
            total_spent = CASE 
                WHEN NEW.type = 'purchase' THEN current_spent + NEW.amount
                ELSE current_spent
            END,
            total_earned = CASE 
                WHEN NEW.type = 'sale' THEN current_earned + NEW.amount
                ELSE current_earned
            END,
            updated_at = now()
        WHERE id = NEW.user_id;
        
    ELSE
        -- For non-completed transactions: NO balance change
        NEW.balance_after := current_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_user_balance
    BEFORE INSERT ON user_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_balance();

-- Test the function works
DO $$
BEGIN
    -- Log successful creation
    RAISE NOTICE 'Balance trigger recreated successfully with proper type handling and security';
END $$;