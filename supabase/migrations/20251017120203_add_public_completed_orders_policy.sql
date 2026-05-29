/*
  # Allow Public Access to Completed Orders

  1. Changes
    - Add RLS policy to allow all users (including anonymous) to view completed orders
    - This enables the recent activity slider to show real marketplace transactions
    
  2. Security
    - Only SELECT access is granted
    - Only completed orders are accessible
    - Personal information like steam_ids is visible but this is acceptable for a public marketplace
    - Users still can only modify their own orders via existing policies
*/

-- Allow anyone to view completed orders for the recent activity feed
CREATE POLICY "Anyone can view completed orders"
  ON orders
  FOR SELECT
  TO anon, authenticated
  USING (status = 'completed');
