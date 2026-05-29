/*
  # Order Verification System

  1. New Tables
    - `order_verifications` - Track verification attempts and results
    - `steam_asset_transfers` - Log asset ownership changes

  2. Security
    - Enable RLS on all new tables
    - Add policies for user access control

  3. Functions
    - Add verification workflow triggers
    - Add comprehensive logging
*/

-- Create order_verifications table to track verification attempts
CREATE TABLE IF NOT EXISTS order_verifications (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id text NOT NULL,
  transaction_id text NOT NULL,
  seller_steam_id text NOT NULL,
  buyer_steam_id text NOT NULL,
  asset_id text NOT NULL,
  verification_type text NOT NULL DEFAULT 'ownership_transfer',
  verification_status text NOT NULL DEFAULT 'pending',
  api_response jsonb DEFAULT '{}',
  verification_timestamp timestamptz DEFAULT now(),
  completed_at timestamptz,
  attempts integer DEFAULT 1,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create steam_asset_transfers table to log ownership changes
CREATE TABLE IF NOT EXISTS steam_asset_transfers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  asset_id text NOT NULL,
  from_steam_id text NOT NULL,
  to_steam_id text NOT NULL,
  order_id text,
  transfer_detected_at timestamptz DEFAULT now(),
  api_source text DEFAULT 'steam_inventory_api',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_verifications_order_id ON order_verifications (order_id);
CREATE INDEX IF NOT EXISTS idx_order_verifications_asset_id ON order_verifications (asset_id);
CREATE INDEX IF NOT EXISTS idx_order_verifications_status ON order_verifications (verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_steam_asset_transfers_asset_id ON steam_asset_transfers (asset_id);
CREATE INDEX IF NOT EXISTS idx_steam_asset_transfers_order_id ON steam_asset_transfers (order_id);

-- Add constraints
ALTER TABLE order_verifications 
ADD CONSTRAINT order_verifications_status_check 
CHECK (verification_status = ANY (ARRAY['pending'::text, 'verifying'::text, 'verified'::text, 'failed'::text, 'disputed'::text]));

ALTER TABLE order_verifications 
ADD CONSTRAINT order_verifications_type_check 
CHECK (verification_type = ANY (ARRAY['ownership_transfer'::text, 'trade_hold_check'::text, 'final_verification'::text]));

-- Enable RLS
ALTER TABLE order_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE steam_asset_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own order verifications"
  ON order_verifications
  FOR SELECT
  TO authenticated
  USING (seller_steam_id = current_setting('app.current_user_steam_id', true) OR buyer_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Service role full access to order verifications"
  ON order_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view asset transfers for their orders"
  ON steam_asset_transfers
  FOR SELECT
  TO authenticated
  USING (from_steam_id = current_setting('app.current_user_steam_id', true) OR to_steam_id = current_setting('app.current_user_steam_id', true));

CREATE POLICY "Service role full access to asset transfers"
  ON steam_asset_transfers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger for order_verifications
CREATE OR REPLACE FUNCTION update_order_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_verifications_updated_at
    BEFORE UPDATE ON order_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_order_verifications_updated_at();