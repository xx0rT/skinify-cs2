/*
  # Create Chat Messages Table

  1. New Tables
    - `chat_messages`
      - `id` (bigint, primary key)
      - `order_id` (text, order reference)
      - `sender_steam_id` (text, sender's Steam ID)
      - `sender_type` (text, 'buyer' or 'seller')
      - `message` (text, message content)
      - `read` (boolean, read status)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for order participants to read/write messages

  3. Indexes
    - Add index on order_id for fast message retrieval
    - Add index on sender_steam_id
    - Add index on created_at for ordering
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id text NOT NULL,
  sender_steam_id text NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('buyer', 'seller')),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_steam_id);

-- RLS Policies
CREATE POLICY "Users can read messages from their orders"
  ON chat_messages
  FOR SELECT
  TO authenticated, anon
  USING (
    order_id IN (
      SELECT transaction_id FROM orders 
      WHERE buyer_steam_id = current_setting('app.current_user_steam_id', true)
         OR seller_steam_id = current_setting('app.current_user_steam_id', true)
    )
  );

CREATE POLICY "Users can send messages to their orders"
  ON chat_messages
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    order_id IN (
      SELECT transaction_id FROM orders 
      WHERE buyer_steam_id = sender_steam_id
         OR seller_steam_id = sender_steam_id
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated, anon
  USING (sender_steam_id = current_setting('app.current_user_steam_id', true))
  WITH CHECK (sender_steam_id = current_setting('app.current_user_steam_id', true));

-- Service role has full access
CREATE POLICY "Service role full access to chat messages"
  ON chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);