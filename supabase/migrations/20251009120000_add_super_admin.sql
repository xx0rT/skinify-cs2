/*
  # Add Super Admin User

  1. Purpose
    - Add Steam ID 76561198021723640 as a super admin
    - Create user if they don't exist
    - Grant super_admin role with full permissions
    - Add is_active column to admin_roles if needed

  2. Process
    - Add is_active column to admin_roles table
    - Check if user exists in users table
    - Add admin_roles entry with super_admin role
    - Ensure user can access admin panel

  3. Security
    - Uses super_admin role for maximum privileges
    - RLS policies already configured to allow super_admin access
*/

-- Add is_active column to admin_roles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_roles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_roles ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE 'Added is_active column to admin_roles table';
  END IF;
END $$;

-- First, check if user exists in users table
-- If not, we'll create a placeholder that will be updated when they log in
DO $$
DECLARE
  v_user_id uuid;
  v_steam_id text := '76561198021723640';
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM users
  WHERE steam_id = v_steam_id;

  -- If user doesn't exist, create a placeholder
  IF v_user_id IS NULL THEN
    INSERT INTO users (steam_id, display_name, avatar_url)
    VALUES (
      v_steam_id,
      'Admin ' || v_steam_id,
      'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created new user with ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'User already exists with ID: %', v_user_id;
  END IF;

  -- admin_roles.user_id has FK to auth.users(id). On a fresh deploy that row
  -- doesn't exist yet (the Steam user hasn't signed in / been mirrored into
  -- auth.users). Skip the role insert if so; the admin can be granted via
  -- the dashboard or by re-running this migration after first login.
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    -- Now create the admin role if it doesn't exist
    DELETE FROM admin_roles WHERE user_id = v_user_id;
    INSERT INTO admin_roles (
      user_id,
      role,
      permissions,
      granted_by,
      granted_at
    )
    VALUES (
      v_user_id,
      'super_admin',
      '["all"]'::jsonb,
      v_user_id,
      now()
    );
    RAISE NOTICE 'Successfully granted super_admin role to user: %', v_user_id;
  ELSE
    RAISE NOTICE 'Skipping admin role insert: auth.users row for % does not exist yet (will be set up after first Steam login)', v_user_id;
  END IF;

END $$;

-- Verify the admin was created
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT
    u.id,
    u.steam_id,
    u.display_name,
    ar.role,
    ar.permissions
  INTO v_result
  FROM users u
  LEFT JOIN admin_roles ar ON ar.user_id = u.id
  WHERE u.steam_id = '76561198021723640';

  RAISE NOTICE 'Admin verification - User ID: %, Steam ID: %, Name: %, Role: %, Permissions: %',
    v_result.id,
    v_result.steam_id,
    v_result.display_name,
    v_result.role,
    v_result.permissions;
END $$;
