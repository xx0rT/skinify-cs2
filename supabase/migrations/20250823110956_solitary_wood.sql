/*
  # Add trade link field to users table

  1. New Columns
    - `trade_link` (text, nullable)
      - Stores user's Steam trade offer URL
      - Required for marketplace trading functionality
      - Validated format: https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXXXX&token=XXXXXXXXX

  2. Changes
    - Add trade_link column to users table
    - Allow null values (users can set it later)
    - Add index for performance

  3. Security
    - No RLS changes needed (inherits from users table)
*/

-- Add trade_link column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'trade_link'
  ) THEN
    ALTER TABLE users ADD COLUMN trade_link text;
  END IF;
END $$;

-- Add index for trade_link queries
CREATE INDEX IF NOT EXISTS idx_users_trade_link ON users(trade_link) WHERE trade_link IS NOT NULL;