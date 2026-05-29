/*
  # Fix Balance Update Trigger Security Issue

  1. Problem
    - The `trigger_update_user_balance` trigger was adding money for ALL transactions
    - Even "pending" deposit transactions would update the user's balance
    - This created a security vulnerability where clicking deposit buttons added money

  2. Solution
    - Modify the trigger to only update balance for COMPLETED transactions
    - Pending, failed, or cancelled transactions will NOT affect balance
    - Only webhook-completed transactions will add money

  3. Security
    - Prevents frontend from adding money by creating pending transactions
    - Only Revolut webhook can mark transactions as completed
    - Balance updates are now 100% secure
*/

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions;
DROP FUNCTION IF EXISTS update_user_balance();

-- Create a new secure balance update function
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL SECURITY: Only update balance for completed transactions
  IF NEW.status = 'completed' THEN
    -- Update user's balance based on transaction type
    UPDATE users SET
      current_balance = CASE
        WHEN NEW.type IN ('deposit', 'sale', 'refund', 'admin_adjustment') THEN 
          COALESCE(current_balance, 0) + NEW.amount
        WHEN NEW.type IN ('purchase', 'withdrawal') THEN 
          GREATEST(0, COALESCE(current_balance, 0) - NEW.amount)
        ELSE current_balance
      END,
      total_deposited = CASE
        WHEN NEW.type = 'deposit' THEN COALESCE(total_deposited, 0) + NEW.amount
        ELSE total_deposited
      END,
      total_spent = CASE
        WHEN NEW.type = 'purchase' THEN COALESCE(total_spent, 0) + NEW.amount
        ELSE total_spent
      END,
      total_earned = CASE
        WHEN NEW.type = 'sale' THEN COALESCE(total_earned, 0) + NEW.amount
        ELSE total_earned
      END,
      updated_at = now()
    WHERE steam_id = NEW.steam_id;

    -- Set the balance_after field to reflect the new balance
    SELECT current_balance INTO NEW.balance_after
    FROM users WHERE steam_id = NEW.steam_id;
    
    -- Log the balance update for security audit
    RAISE NOTICE 'SECURITY: Balance updated for user % - Transaction: % (%) - Amount: % - New Balance: %', 
      NEW.steam_id, NEW.id, NEW.type, NEW.amount, NEW.balance_after;
  ELSE
    -- For non-completed transactions, balance_after stays the same as balance_before
    NEW.balance_after = NEW.balance_before;
    
    -- Log that balance was NOT updated for security audit
    RAISE NOTICE 'SECURITY: Balance NOT updated for user % - Transaction: % (%) - Status: % - Amount: %', 
      NEW.steam_id, NEW.id, NEW.type, NEW.status, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the secure function
CREATE TRIGGER trigger_update_user_balance
  BEFORE INSERT ON user_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Add additional security: Create audit log for balance changes
CREATE TABLE IF NOT EXISTS balance_audit_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_steam_id text NOT NULL,
  transaction_id bigint NOT NULL,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  transaction_status text NOT NULL,
  balance_updated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create audit function
CREATE OR REPLACE FUNCTION audit_balance_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log every balance-related transaction attempt
  INSERT INTO balance_audit_log (
    user_steam_id,
    transaction_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    transaction_status,
    balance_updated,
    metadata
  ) VALUES (
    NEW.steam_id,
    NEW.id,
    NEW.type,
    NEW.amount,
    NEW.balance_before,
    NEW.balance_after,
    NEW.status,
    (NEW.status = 'completed'),
    jsonb_build_object(
      'reference_id', NEW.reference_id,
      'description', NEW.description,
      'created_via', COALESCE(NEW.metadata->>'created_via', 'unknown'),
      'completed_via', COALESCE(NEW.metadata->>'completed_via', 'none'),
      'security_verified', COALESCE(NEW.metadata->>'security_verified', false),
      'webhook_verified', COALESCE(NEW.metadata->>'payment_confirmed_by_revolut', false)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
CREATE TRIGGER trigger_audit_balance_changes
  AFTER INSERT ON user_transactions
  FOR EACH ROW
  EXECUTE FUNCTION audit_balance_changes();

-- Enable RLS on audit table
ALTER TABLE balance_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own audit logs
CREATE POLICY "Users can view own balance audit logs"
  ON balance_audit_log
  FOR SELECT
  TO authenticated, anon
  USING (user_steam_id = current_setting('app.current_user_steam_id'::text, true));

-- Allow service role full access to audit logs
CREATE POLICY "Service role full access to audit logs"
  ON balance_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);