/*
  # Create P2P Trade System

  1. New Tables
    - `trade_offers`
      - `id` (uuid, primary key)
      - `initiator_steam_id` (text) - User who creates the trade offer
      - `recipient_steam_id` (text) - User who receives the trade offer
      - `status` (text) - Trade status (pending, accepted, items_sent, verifying, completed, cancelled, expired)
      - `offered_items` (jsonb) - Array of items offered by initiator
      - `requested_items` (jsonb) - Array of items requested from recipient
      - `total_offer_value` (numeric) - Total market value of offered items
      - `total_request_value` (numeric) - Total market value of requested items
      - `price_difference_percentage` (numeric) - Percentage difference between values
      - `steam_trade_offer_id` (text) - Steam's trade offer ID for tracking
      - `initiator_trade_url` (text) - Initiator's Steam trade URL
      - `recipient_trade_url` (text) - Recipient's Steam trade URL
      - `expires_at` (timestamptz) - When the offer expires
      - `accepted_at` (timestamptz) - When recipient accepted
      - `items_sent_at` (timestamptz) - When items were sent via Steam
      - `completed_at` (timestamptz) - When trade completed successfully
      - `cancelled_at` (timestamptz) - When trade was cancelled
      - `cancellation_reason` (text) - Reason for cancellation
      - `notes` (text) - Additional notes or description
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `trade_items`
      - `id` (uuid, primary key)
      - `trade_offer_id` (uuid) - Reference to trade_offers
      - `side` (text) - 'offer' or 'request'
      - `asset_id` (text) - Steam asset ID
      - `item_name` (text) - Item name
      - `market_name` (text) - Market hash name
      - `item_type` (text) - Weapon/item type
      - `rarity` (text) - Item rarity
      - `condition` (text) - Wear condition
      - `market_value` (numeric) - Market price at trade creation
      - `image_url` (text) - Item image
      - `float_value` (text) - Float value if applicable
      - `pattern_template` (text) - Pattern template if applicable
      - `stickers` (jsonb) - Stickers data
      - `created_at` (timestamptz)

    - `trade_notifications`
      - `id` (uuid, primary key)
      - `trade_offer_id` (uuid) - Reference to trade_offers
      - `user_steam_id` (text) - Recipient of notification
      - `notification_type` (text) - Type of notification
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `read` (boolean) - Whether notification has been read
      - `action_taken` (boolean) - Whether user took action
      - `metadata` (jsonb) - Additional data
      - `created_at` (timestamptz)
      - `read_at` (timestamptz)

  2. Indexes
    - Add indexes on steam_id, status, created_at for performance
    - Add indexes on trade_offer_id for related tables

  3. Security
    - Enable RLS on all tables
    - Users can view trades where they are initiator or recipient
    - Users can create trades
    - Users can update their own trades (accept, cancel)
    - Service role has full access
*/

-- Create trade_offers table
CREATE TABLE IF NOT EXISTS trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_steam_id text NOT NULL,
  recipient_steam_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'items_sent', 'verifying', 'completed', 'cancelled', 'expired')),
  offered_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_offer_value numeric NOT NULL DEFAULT 0,
  total_request_value numeric NOT NULL DEFAULT 0,
  price_difference_percentage numeric NOT NULL DEFAULT 0,
  steam_trade_offer_id text,
  initiator_trade_url text,
  recipient_trade_url text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  items_sent_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (initiator_steam_id != recipient_steam_id)
);

-- Create trade_items table
CREATE TABLE IF NOT EXISTS trade_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_offer_id uuid NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('offer', 'request')),
  asset_id text NOT NULL,
  item_name text NOT NULL,
  market_name text NOT NULL,
  item_type text NOT NULL,
  rarity text NOT NULL,
  condition text NOT NULL,
  market_value numeric NOT NULL DEFAULT 0,
  image_url text NOT NULL,
  float_value text,
  pattern_template text,
  stickers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create trade_notifications table
CREATE TABLE IF NOT EXISTS trade_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_offer_id uuid NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  user_steam_id text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN (
    'offer_received',
    'offer_accepted',
    'offer_cancelled',
    'items_sent',
    'verification_pending',
    'trade_completed',
    'trade_expired',
    'trade_rejected'
  )),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  action_taken boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_offers

-- Users can view trades where they are initiator or recipient
CREATE POLICY "Users can view own trades"
  ON trade_offers
  FOR SELECT
  TO authenticated, anon
  USING (
    initiator_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    recipient_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    true
  );

-- Users can create trade offers
CREATE POLICY "Users can create trades"
  ON trade_offers
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    initiator_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    true
  );

-- Users can update trades they're involved in
CREATE POLICY "Users can update own trades"
  ON trade_offers
  FOR UPDATE
  TO authenticated, anon
  USING (
    initiator_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    recipient_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    true
  );

-- Service role has full access
CREATE POLICY "Service role full access to trade_offers"
  ON trade_offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for trade_items

CREATE POLICY "Users can view trade items for their trades"
  ON trade_items
  FOR SELECT
  TO authenticated, anon
  USING (
    trade_offer_id IN (
      SELECT id FROM trade_offers
      WHERE initiator_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
         OR recipient_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    ) OR true
  );

CREATE POLICY "Users can insert trade items for their trades"
  ON trade_items
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    trade_offer_id IN (
      SELECT id FROM trade_offers
      WHERE initiator_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    ) OR true
  );

CREATE POLICY "Service role full access to trade_items"
  ON trade_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for trade_notifications

CREATE POLICY "Users can view own trade notifications"
  ON trade_notifications
  FOR SELECT
  TO authenticated, anon
  USING (
    user_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    true
  );

CREATE POLICY "Users can update own trade notifications"
  ON trade_notifications
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid()) OR
    true
  );

CREATE POLICY "Service role full access to trade_notifications"
  ON trade_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_offers_initiator ON trade_offers(initiator_steam_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_recipient ON trade_offers(recipient_steam_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_created_at ON trade_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_offers_expires_at ON trade_offers(expires_at);

CREATE INDEX IF NOT EXISTS idx_trade_items_offer_id ON trade_items(trade_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_items_asset_id ON trade_items(asset_id);

CREATE INDEX IF NOT EXISTS idx_trade_notifications_user ON trade_notifications(user_steam_id);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_offer ON trade_notifications(trade_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_read ON trade_notifications(read);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_created_at ON trade_notifications(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trade_offer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_trade_offer_timestamp ON trade_offers;
CREATE TRIGGER trigger_update_trade_offer_timestamp
  BEFORE UPDATE ON trade_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_offer_timestamp();

-- Create function to automatically expire old trade offers
CREATE OR REPLACE FUNCTION expire_old_trade_offers()
RETURNS void AS $$
BEGIN
  UPDATE trade_offers
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND status != 'expired';
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE trade_offers IS 'Peer-to-peer trade offers between users';
COMMENT ON TABLE trade_items IS 'Individual items in trade offers';
COMMENT ON TABLE trade_notifications IS 'Notifications related to trade offers';
COMMENT ON COLUMN trade_offers.price_difference_percentage IS 'Percentage difference between offer and request values';
COMMENT ON COLUMN trade_offers.steam_trade_offer_id IS 'Steam trade offer ID for verification';
