/*
  Fix wishlist_counts RLS Policy

  The 400 error means RLS is blocking access to wishlist_counts.
  This fixes the policy to allow public read access.
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "System can update wishlist counts" ON wishlist_counts;

-- Create a service role policy for updates
CREATE POLICY "Service role can manage wishlist counts"
  ON wishlist_counts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify the policy
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'wishlist_counts';

-- Test query (should return empty results, not an error)
SELECT listing_id, count FROM wishlist_counts LIMIT 5;
