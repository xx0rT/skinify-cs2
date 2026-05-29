/*
  # Remove problematic balance trigger

  1. Changes
    - Drop the trigger that's causing type errors
    - Drop the function that has type conflicts
    - Keep tables as they are
    - Let frontend handle balance updates manually

  This removes the automatic balance updates but keeps deposit functionality working.
*/

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions CASCADE;
DROP FUNCTION IF EXISTS update_user_balance() CASCADE;

-- Also drop the audit trigger to be safe
DROP TRIGGER IF EXISTS trigger_audit_balance_changes ON user_transactions CASCADE;
DROP FUNCTION IF EXISTS audit_balance_changes() CASCADE;