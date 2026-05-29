/*
  # Fix User Shops Foreign Key

  1. Changes
    - Drop existing foreign key constraint that references auth.users
    - Add new foreign key constraint that references users table
    - This allows user shops to work with the custom users table

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_shops
DROP CONSTRAINT IF EXISTS user_shops_user_id_fkey;

-- Add the correct foreign key constraint pointing to users table
ALTER TABLE user_shops
ADD CONSTRAINT user_shops_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;
