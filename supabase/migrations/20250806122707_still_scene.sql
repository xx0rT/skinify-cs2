/*
  # Create users table for Steam authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `steam_id` (text, unique)
      - `display_name` (text)
      - `avatar_url` (text)
      - `avatar_full_url` (text)
      - `profile_url` (text)
      - `real_name` (text, nullable)
      - `steam_created_at` (timestamp, nullable)
      - `last_login` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authentication flow
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  avatar_full_url text,
  profile_url text,
  real_name text,
  steam_created_at timestamptz,
  last_login timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow user operations during auth" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Allow user creation during auth" ON users;
DROP POLICY IF EXISTS "Allow user updates during auth" ON users;

-- Create comprehensive policies for authentication
CREATE POLICY "Allow all operations for anon users" 
  ON users FOR ALL 
  TO anon 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" 
  ON users FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS users_steam_id_idx ON users(steam_id);
CREATE INDEX IF NOT EXISTS users_last_login_idx ON users(last_login);