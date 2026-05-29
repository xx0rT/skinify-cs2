-- ================================================================
-- SIMPLE WISHLIST FIX - COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- ================================================================
-- Go to: https://supabase.com/dashboard/project/jtxqvctllitlhijfcsxg/sql
-- Paste this ENTIRE file and click RUN
-- ================================================================

-- Step 1: Check if tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wishlist_items') THEN
    RAISE NOTICE '❌ wishlist_items table DOES NOT EXIST - creating now...';
  ELSE
    RAISE NOTICE '✅ wishlist_items table already exists';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wishlist_counts') THEN
    RAISE NOTICE '❌ wishlist_counts table DOES NOT EXIST - creating now...';
  ELSE
    RAISE NOTICE '✅ wishlist_counts table already exists';
  END IF;
END $$;

-- Step 2: Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Step 3: Create wishlist_counts table
CREATE TABLE IF NOT EXISTS wishlist_counts (
  listing_id uuid PRIMARY KEY,
  count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_counts ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own wishlist items" ON wishlist_items;
DROP POLICY IF EXISTS "Users can add to own wishlist" ON wishlist_items;
DROP POLICY IF EXISTS "Users can remove from own wishlist" ON wishlist_items;
DROP POLICY IF EXISTS "Anyone can view wishlist counts" ON wishlist_counts;
DROP POLICY IF EXISTS "System can update wishlist counts" ON wishlist_counts;
DROP POLICY IF EXISTS "Service role can manage wishlist counts" ON wishlist_counts;

-- Step 6: Create NEW policies for wishlist_items
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

-- Step 7: Create policies for wishlist_counts (PUBLIC READ!)
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

-- Step 8: Create or replace the trigger function
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

-- Step 9: Create the trigger
DROP TRIGGER IF EXISTS update_wishlist_count_trigger ON wishlist_items;
CREATE TRIGGER update_wishlist_count_trigger
  AFTER INSERT OR DELETE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_count();

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_listing_id ON wishlist_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_counts_listing_id ON wishlist_counts(listing_id);

-- Step 11: Verify everything was created
SELECT
  '✅ VERIFICATION' as status,
  'Tables Created' as check_name,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts')) as result,
  '2 expected' as expected
UNION ALL
SELECT
  '✅ VERIFICATION',
  'Policies Created',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('wishlist_items', 'wishlist_counts')) as result,
  '6 expected'
UNION ALL
SELECT
  '✅ VERIFICATION',
  'Indexes Created',
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts')) as result,
  '3+ expected'
UNION ALL
SELECT
  '✅ VERIFICATION',
  'RLS Enabled',
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('wishlist_items', 'wishlist_counts') AND rowsecurity = true) as result,
  '2 expected';

-- ================================================================
-- ✅ IF YOU SEE ALL GREEN CHECKS ABOVE, YOU'RE DONE!
-- ================================================================
-- Next step: Deploy your site and test!
-- ================================================================
