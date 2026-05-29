/*
  # Add PayU Payment Support

  1. Updates
    - Add payment_method column to user_transactions if it doesn't exist
    - PayU processes payments in USD but we store amounts in CZK
    - Webhook will handle conversion and balance updates

  2. Notes
    - Uses existing user_transactions table
    - All existing data remains unchanged
    - PayU transactions will be tracked with metadata
*/

-- Add payment_method column to user_transactions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE user_transactions ADD COLUMN payment_method text DEFAULT 'system';
    COMMENT ON COLUMN user_transactions.payment_method IS 'Payment method: revolut, payu, crypto, bank_transfer, or system';
  END IF;
END $$;

-- Create index for faster PayU transaction lookups
CREATE INDEX IF NOT EXISTS idx_user_transactions_reference_id
  ON user_transactions(reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_transactions_payment_method
  ON user_transactions(payment_method, created_at DESC)
  WHERE payment_method IS NOT NULL;
