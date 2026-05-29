/*
  # Add CRUD Policies for Marketplace Listings

  This migration adds INSERT, UPDATE, and DELETE policies for the marketplace_listings table
  to allow users to manage their own listings.

  1. Security
    - Users can only insert listings with their own user_id or steam_id
    - Users can only update their own listings
    - Users can only delete their own listings
    - All policies verify the user is authenticated and owns the listing

  2. Policies Created
    - INSERT: Allow authenticated users to create listings
    - UPDATE: Allow users to update their own listings
    - DELETE: Allow users to delete their own listings

  3. Notes
    - Policies check user_id first (most efficient)
    - Falls back to steam_id check if user_id is NULL
*/

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can create marketplace listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can update own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON marketplace_listings;

-- Policy for INSERT: Users can create listings for themselves
CREATE POLICY "Users can create marketplace listings"
  ON marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    )
  );

-- Policy for UPDATE: Users can update their own listings
CREATE POLICY "Users can update own listings"
  ON marketplace_listings
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    )
  );

-- Policy for DELETE: Users can delete their own listings
CREATE POLICY "Users can delete own listings"
  ON marketplace_listings
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND steam_id IN (SELECT steam_id FROM users WHERE id = auth.uid())
    )
  );
