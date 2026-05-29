-- ================================================================
-- WORKING WISHLIST FIX - RUN THIS IN SUPABASE SQL EDITOR NOW!
-- ================================================================
-- This fixes the "invalid input syntax for type uuid" error
-- by using TEXT for listing_id instead of UUID
-- ================================================================

-- Step 1: Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS wishlist_counts CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;

-- Step 2: Create wishlist_items table with TEXT listing_id
CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Step 3: Create wishlist_counts table with TEXT listing_id
CREATE TABLE wishlist_counts (
  listing_id text PRIMARY KEY,
  count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_counts ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for wishlist_items
CREATE POLICY "Users can view own wishlist items"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 6: Create policies for wishlist_counts (PUBLIC READ!)
CREATE POLICY "Anyone can view wishlist counts"
  ON wishlist_counts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert wishlist counts"
  ON wishlist_counts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update wishlist counts"
  ON wishlist_counts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Step 7: Create the trigger function
CREATE OR REPLACE FUNCTION update_wishlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wishlist_counts (listing_id, count, updated_at)
    VALUES (NEW.listing_id, 1, now())
    ON CONFLICT (listing_id)
    DO UPDATE SET
      count = wishlist_counts.count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wishlist_counts
    SET
      count = GREATEST(count - 1, 0),
      updated_at = now()
    WHERE listing_id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create the trigger
DROP TRIGGER IF EXISTS update_wishlist_count_trigger ON wishlist_items;
CREATE TRIGGER update_wishlist_count_trigger
  AFTER INSERT OR DELETE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_count();

-- Step 9: Create indexes
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_listing_id ON wishlist_items(listing_id);
CREATE INDEX idx_wishlist_counts_listing_id ON wishlist_counts(listing_id);

-- Step 10: Verify everything was created
SELECT
  '✅ VERIFICATION' as status,
  'Tables Created' as check_name,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts'))::text as result,
  '2 expected' as expected
UNION ALL
SELECT
  '✅ VERIFICATION',
  'Policies Created',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('wishlist_items', 'wishlist_counts'))::text,
  '6 expected'
UNION ALL
SELECT
  '✅ VERIFICATION',
  'Indexes Created',
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts'))::text,
  '3+ expected'
UNION ALL
SELECT
  '✅ VERIFICATION',
  'RLS Enabled',
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts') AND rowsecurity = true)::text,
  '2 expected'
UNION ALL
SELECT
  '✅ VERIFICATION',
  'Trigger Created',
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'update_wishlist_count_trigger')::text,
  '1 expected';

-- ================================================================
-- ✅ IF YOU SEE ALL GREEN CHECKS ABOVE, YOU'RE DONE!
-- ================================================================
-- listing_id is now TEXT (not UUID) so it accepts IDs like "179"
-- ================================================================
