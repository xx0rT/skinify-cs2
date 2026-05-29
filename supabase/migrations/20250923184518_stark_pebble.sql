/*
  # Add Foreign Key Relationships for Hot Items

  1. Foreign Key Constraints
    - `hot_items.listing_id` → `marketplace_listings.id`
    - `hot_items.user_steam_id` → `users.steam_id`
  
  2. Purpose
    - Enable Supabase PostgREST to infer table relationships
    - Allow hot-items edge function to perform joins properly
    - Maintain referential integrity

  3. Impact
    - Fixes "Could not find a relationship" error in hot-items function
    - Enables proper joins between hot_items, marketplace_listings, and users tables
*/

-- Add foreign key constraint from hot_items.listing_id to marketplace_listings.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'hot_items_listing_id_fkey'
  ) THEN
    ALTER TABLE hot_items 
    ADD CONSTRAINT hot_items_listing_id_fkey 
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint from hot_items.user_steam_id to users.steam_id  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'hot_items_user_steam_id_fkey'
  ) THEN
    ALTER TABLE hot_items 
    ADD CONSTRAINT hot_items_user_steam_id_fkey 
    FOREIGN KEY (user_steam_id) REFERENCES users(steam_id) ON DELETE CASCADE;
  END IF;
END $$;