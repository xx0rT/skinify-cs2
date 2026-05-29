/*
  # Add Username Field and Update Shop URLs

  1. Changes Made
    - Add `username` column to users table
    - Generate unique usernames from display_name for existing users
    - Update shop_url generation to use username instead of user_id
    - Add index on username for faster lookups
    - Update generate_shop_url function to use username

  2. Migration Steps
    - Add username column to users table (nullable initially)
    - Generate usernames for all existing users
    - Make username NOT NULL after population
    - Update shop URLs to use username format
    - Add unique constraint on username

  3. Security
    - Maintain existing RLS policies
    - Ensure username uniqueness
*/

-- ============================================
-- 1. ADD USERNAME COLUMN TO USERS TABLE
-- ============================================

-- Add username column (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text;
  END IF;
END $$;

-- ============================================
-- 2. GENERATE USERNAMES FOR EXISTING USERS
-- ============================================

-- Function to generate unique username from display name
CREATE OR REPLACE FUNCTION generate_unique_username(base_name text, user_uuid uuid)
RETURNS text AS $$
DECLARE
  sanitized_name text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Sanitize display name: lowercase, replace spaces/special chars with hyphens
  sanitized_name := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '-', 'g'));
  sanitized_name := regexp_replace(sanitized_name, '-+', '-', 'g');
  sanitized_name := trim(both '-' from sanitized_name);

  -- Ensure minimum length
  IF length(sanitized_name) < 3 THEN
    sanitized_name := 'user-' || sanitized_name;
  END IF;

  final_username := sanitized_name;

  -- Check if username exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username AND id != user_uuid) LOOP
    counter := counter + 1;
    final_username := sanitized_name || '-' || counter;
  END LOOP;

  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Populate usernames for all existing users
UPDATE users
SET username = generate_unique_username(display_name, id)
WHERE username IS NULL;

-- Make username NOT NULL and add unique constraint
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END $$;

-- Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 3. UPDATE SHOP_URL GENERATION FUNCTION
-- ============================================

-- Update generate_shop_url function to accept user_id and fetch username
CREATE OR REPLACE FUNCTION generate_shop_url(user_uuid uuid)
RETURNS text AS $$
DECLARE
  user_username text;
  base_url text;
  final_url text;
  counter integer := 0;
BEGIN
  -- Get username from users table
  SELECT username INTO user_username
  FROM users
  WHERE id = user_uuid;

  IF user_username IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Username is already sanitized, so use it directly
  base_url := user_username;
  final_url := base_url;

  -- Check if URL exists and append number if needed
  WHILE EXISTS (SELECT 1 FROM user_shops WHERE shop_url = final_url AND user_id != user_uuid) LOOP
    counter := counter + 1;
    final_url := base_url || '-shop-' || counter;
  END LOOP;

  RETURN final_url;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. UPDATE EXISTING SHOP URLs
-- ============================================

-- Update existing shop URLs to use username format
UPDATE user_shops
SET shop_url = generate_shop_url(user_id)
WHERE user_id IN (SELECT id FROM users WHERE username IS NOT NULL);

-- ============================================
-- 5. ADD TRIGGER TO AUTO-GENERATE USERNAME
-- ============================================

-- Function to auto-generate username on user creation
CREATE OR REPLACE FUNCTION auto_generate_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := generate_unique_username(NEW.display_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user insertions
DROP TRIGGER IF EXISTS trigger_auto_generate_username ON users;
CREATE TRIGGER trigger_auto_generate_username
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_username();

-- ============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure functions can be executed
GRANT EXECUTE ON FUNCTION generate_unique_username(text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_shop_url(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auto_generate_username() TO authenticated, anon;
