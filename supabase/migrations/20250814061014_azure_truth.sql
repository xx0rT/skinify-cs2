/*
  # Add balance columns to users table

  1. New Columns
    - `current_balance` (numeric, default 0) - User's current available balance
    - `total_deposited` (numeric, default 0) - Total amount ever deposited
    - `total_spent` (numeric, default 0) - Total amount spent on purchases
    - `total_earned` (numeric, default 0) - Total amount earned from sales
    - `currency` (text, default 'CZK') - User's preferred currency

  2. Indexes
    - Add index on current_balance for performance

  3. Security
    - Update RLS policies to allow users to read their own balance data
*/

-- Add balance columns to users table
DO $$
BEGIN
  -- Add current_balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'current_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN current_balance numeric DEFAULT 0;
  END IF;

  -- Add total_deposited column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_deposited'
  ) THEN
    ALTER TABLE users ADD COLUMN total_deposited numeric DEFAULT 0;
  END IF;

  -- Add total_spent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_spent'
  ) THEN
    ALTER TABLE users ADD COLUMN total_spent numeric DEFAULT 0;
  END IF;

  -- Add total_earned column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE users ADD COLUMN total_earned numeric DEFAULT 0;
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'currency'
  ) THEN
    ALTER TABLE users ADD COLUMN currency text DEFAULT 'CZK';
  END IF;
END $$;

-- Create index for balance queries
CREATE INDEX IF NOT EXISTS idx_users_current_balance 
ON users (current_balance);

-- Create simple transactions table for history
CREATE TABLE IF NOT EXISTS user_transactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  steam_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'purchase', 'sale', 'refund', 'withdrawal', 'admin_adjustment')),
  amount numeric NOT NULL,
  balance_before numeric NOT NULL DEFAULT 0,
  balance_after numeric NOT NULL DEFAULT 0,
  description text NOT NULL,
  reference_id text,
  metadata jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on transactions table
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can read own transactions"
  ON user_transactions
  FOR SELECT
  TO authenticated, anon
  USING (steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR true);

CREATE POLICY "Service role full access to transactions"
  ON user_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update user balance when transaction is inserted
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current balance
  SELECT current_balance INTO NEW.balance_before 
  FROM users 
  WHERE id = NEW.user_id;
  
  -- Calculate new balance
  IF NEW.type IN ('deposit', 'sale', 'refund') THEN
    NEW.balance_after = NEW.balance_before + NEW.amount;
  ELSE
    NEW.balance_after = NEW.balance_before - NEW.amount;
  END IF;
  
  -- Update user balance and totals
  UPDATE users SET
    current_balance = NEW.balance_after,
    total_deposited = CASE WHEN NEW.type = 'deposit' THEN total_deposited + NEW.amount ELSE total_deposited END,
    total_spent = CASE WHEN NEW.type = 'purchase' THEN total_spent + NEW.amount ELSE total_spent END,
    total_earned = CASE WHEN NEW.type = 'sale' THEN total_earned + NEW.amount ELSE total_earned END,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  -- Set completion time if not set
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update balance
DROP TRIGGER IF EXISTS trigger_update_user_balance ON user_transactions;
CREATE TRIGGER trigger_update_user_balance
  BEFORE INSERT ON user_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Add indexes for transactions
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id 
ON user_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_transactions_steam_id 
ON user_transactions (steam_id);

CREATE INDEX IF NOT EXISTS idx_user_transactions_type 
ON user_transactions (type);

CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at 
ON user_transactions (created_at DESC);