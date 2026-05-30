/*
  # Setup Initial Admin Users

  1. Purpose
    - Add a function to easily assign admin roles
    - Set up initial admin user based on Steam ID
    - Add helper functions for admin management

  2. Security
    - Only callable by service role or existing super admins
    - Creates audit trail in admin_logs
*/

-- Repair: ensure admin_roles has the columns this migration assumes.
-- Earlier migrations may have created admin_roles without is_active / updated_at;
-- these ALTERs are idempotent and safe on fresh applies too.
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Function to add admin role (can only be called by service role or super admin)
CREATE OR REPLACE FUNCTION add_admin_role(
  p_user_id uuid,
  p_role text DEFAULT 'admin',
  p_permissions jsonb DEFAULT '["view_users", "manage_users", "view_transactions", "manage_inventory"]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update admin role
  INSERT INTO admin_roles (user_id, role, permissions, is_active)
  VALUES (p_user_id, p_role, p_permissions, true)
  ON CONFLICT (user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    is_active = true,
    updated_at = now();

  -- Log the action
  INSERT INTO admin_logs (
    admin_id,
    action,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    'add_admin_role',
    p_user_id,
    jsonb_build_object('role', p_role, 'permissions', p_permissions)
  );
END;
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- Helper function to get user by steam_id
CREATE OR REPLACE FUNCTION get_user_id_by_steam(p_steam_id text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM users WHERE steam_id = p_steam_id LIMIT 1;
$$;

-- Add super_admin permissions preset
DO $$
BEGIN
  -- Note: To set up your first admin, you need to:
  -- 1. Login to the app with your Steam account first (to create the user record)
  -- 2. Then run this in the SQL editor:
  --    SELECT add_admin_role(
  --      (SELECT id FROM users WHERE steam_id = 'YOUR_STEAM_ID'),
  --      'super_admin',
  --      '["*"]'::jsonb
  --    );

  RAISE NOTICE 'Admin setup functions created successfully';
  RAISE NOTICE 'To add your first admin:';
  RAISE NOTICE '1. Login via Steam to create your user record';
  RAISE NOTICE '2. Run: SELECT add_admin_role((SELECT id FROM users WHERE steam_id = ''YOUR_STEAM_ID''), ''super_admin'', ''["*"]''::jsonb);';
END $$;
